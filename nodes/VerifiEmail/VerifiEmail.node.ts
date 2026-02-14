import {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	NodeOperationError,
	IHttpRequestMethods,
	IHttpRequestOptions,
	NodeConnectionType,
} from 'n8n-workflow';

export class VerifiEmail implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Verifi Email',
		name: 'verifiEmail',
		icon: { light:'file:verifiemail.svg', dark: 'file:verifiemail.svg' },
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"]}}',
		description: 'Email validation and domain health check using VerifiEmail API',
		defaults: {
			name: 'Verifi Email',
		},
		inputs: [{ type: NodeConnectionType.Main }],
		outputs: [{ type: NodeConnectionType.Main }],
		credentials: [
			{
				name: 'verifiEmailApi',
				required: true,
			},
		],
		usableAsTool: true,
		properties: [
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Validate Email Address',
						value: 'validateEmail',
						description: 'Validate a Single Email Address',
						action: 'Validate an email address',
					},
					{
						name: 'Validate Multiple Emails',
						value: 'bulkValidateEmails',
						description: 'Validate Multiple Email Addresses in Bulk',
						action: 'Validate multiple email addresses',
					},
					{
						name: 'Check Domain Health',
						value: 'checkDomainHealth',
						description: 'Check Domain Health and Configuration',
						action: 'Check domain health',
					},
				],
				default: 'validateEmail',
			},
			{
				displayName: 'Email',
				name: 'email',
				type: 'string',
				required: true,
				displayOptions: {
					show: {
						operation: ['validateEmail'],
					},
				},
				default: 'contact@verifi.email',
				placeholder: 'user@example.org',
				description: 'The email address to validate',
			},
			{
				displayName: 'Email Input Method',
				name: 'emailInputMethod',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						operation: ['bulkValidateEmails'],
					},
				},
				options: [
					{
						name: 'JSON Array',
						value: 'jsonArray',
						description: 'Provide emails as a JSON array',
					},
					{
						name: 'Comma Separated',
						value: 'commaSeparated',
						description: 'Provide emails as comma-separated values',
					},
					{
						name: 'Individual Emails',
						value: 'individual',
						description: 'Add individual email addresses',
					},
				],
				default: 'jsonArray',
			},
			{
				displayName: 'Emails (JSON Array)',
				name: 'emailsJson',
				type: 'string',
				displayOptions: {
					show: {
						operation: ['bulkValidateEmails'],
						emailInputMethod: ['jsonArray'],
					},
				},
				default: '["user1@example.org", "user2@example.org", "invalid-email"]',
				placeholder: '["user1@example.org", "user2@example.org"]',
				description: 'Array of email addresses to validate in JSON format',
			},
			{
				displayName: 'Emails (Comma Separated)',
				name: 'emailsCommaSeparated',
				type: 'string',
				displayOptions: {
					show: {
						operation: ['bulkValidateEmails'],
						emailInputMethod: ['commaSeparated'],
					},
				},
				default: 'user1@example.org, user2@example.org, invalid-email',
				placeholder: 'user1@example.org, user2@example.org',
				description: 'Comma-separated list of email addresses to validate',
			},
			{
				displayName: 'Emails',
				name: 'emails',
				type: 'fixedCollection',
				typeOptions: {
					multipleValues: true,
				},
				displayOptions: {
					show: {
						operation: ['bulkValidateEmails'],
						emailInputMethod: ['individual'],
					},
				},
				default: {},
				options: [
					{
						name: 'emailAddress',
						displayName: 'Email Address',
						values: [
							{
								displayName: 'Email',
								name: 'email',
								type: 'string',
								default: '',
								placeholder: 'user@example.org',
								description: 'Email address to validate',
								required: true,
							},
						],
					},
				],
			},
			{
				displayName: 'Domain',
				name: 'domain',
				type: 'string',
				required: true,
				displayOptions: {
					show: {
						operation: ['checkDomainHealth'],
					},
				},
				default: 'verifi.email',
				placeholder: 'example.org',
				description: 'The domain to check',
			},
			{
				displayName: 'Selector',
				name: 'selector',
				type: 'string',
				displayOptions: {
					show: {
						operation: ['checkDomainHealth'],
					},
				},
				default: 'google',
				placeholder: 'google',
				description: "DKIM selector to check (optional). Use 'google' or 'default'.",
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		for (let i = 0; i < items.length; i++) {
			try {
				const operation = this.getNodeParameter('operation', i) as string;
				await this.getCredentials('verifiEmailApi', i);

				if (operation === 'validateEmail') {
					const email = this.getNodeParameter('email', i) as string;

					if (!email) {
						throw new NodeOperationError(this.getNode(), 'Email address is required', {
							itemIndex: i,
						});
					}

				const options: IHttpRequestOptions = {
						method: 'GET' as IHttpRequestMethods,
					url: 'https://api.verifi.email/check',
					qs: {
						email: email,
					},
						json: true,
						skipSslCertificateValidation: true,
					};

					const response = await this.helpers.httpRequestWithAuthentication.call(
						this,
						'verifiEmailApi',
						options,
					);

					returnData.push({
						json: {
							email,
							...response,
						},
						pairedItem: {
							item: i,
						},
					});

				} else if (operation === 'bulkValidateEmails') {
					const emailInputMethod = this.getNodeParameter('emailInputMethod', i) as string;
					let emails: string[] = [];

					if (emailInputMethod === 'jsonArray') {
						const emailsJson = this.getNodeParameter('emailsJson', i) as string;
						try {
							emails = JSON.parse(emailsJson);
							if (!Array.isArray(emails)) {
								throw new NodeOperationError(this.getNode(), 'Emails must be provided as a JSON array', {
									itemIndex: i,
								});
							}
						} catch (error) {
							throw new NodeOperationError(this.getNode(), 'Invalid JSON format for emails array', {
								itemIndex: i,
							});
						}
					} else if (emailInputMethod === 'commaSeparated') {
						const emailsCommaSeparated = this.getNodeParameter('emailsCommaSeparated', i) as string;
						emails = emailsCommaSeparated
							.split(',')
							.map(email => email.trim().replace(/^["']|["']$/g, ''))
							.filter(email => email.length > 0);
					} else if (emailInputMethod === 'individual') {
						const emailsData = this.getNodeParameter('emails', i) as any;
						if (emailsData && emailsData.emailAddress) {
							emails = emailsData.emailAddress.map((item: any) => item.email).filter((email: string) => email);
						}
					}

					if (!emails || emails.length === 0) {
						throw new NodeOperationError(this.getNode(), 'At least one email address is required', {
							itemIndex: i,
						});
					}

					const options: IHttpRequestOptions = {
						method: 'POST' as IHttpRequestMethods,
						url: 'https://api.verifi.email/v1/bulk/check',
						headers: {
							'Accept': 'application/json',
							'Content-Type': 'application/json',
						},
						body: {
							emails: emails,
						},
						json: true,
						skipSslCertificateValidation: true,
					};

					const response = await this.helpers.httpRequestWithAuthentication.call(
						this,
						'verifiEmailApi',
						options,
					);

					returnData.push({
						json: {
							emails: emails,
							...response,
						},
						pairedItem: {
							item: i,
						},
					});

				} else if (operation === 'checkDomainHealth') {
					const domain = this.getNodeParameter('domain', i) as string;
					const selector = this.getNodeParameter('selector', i) as string;

					if (!domain) {
						throw new NodeOperationError(this.getNode(), 'Domain is required', {
							itemIndex: i,
						});
					}

				const queryParams: any = {
					domain: domain,
				};

					// Add selector only if provided
					if (selector) {
						queryParams.selector = selector;
					}

				const options: IHttpRequestOptions = {
						method: 'GET' as IHttpRequestMethods,
						url: 'https://api.verifi.email/v1/domain/check',
						qs: queryParams,
						json: true,
						skipSslCertificateValidation: true,
					};

					const response = await this.helpers.httpRequestWithAuthentication.call(
						this,
						'verifiEmailApi',
						options,
					);

					returnData.push({
						json: {
							domain,
							selector: selector || null,
							...response,
						},
						pairedItem: {
							item: i,
						},
					});
				}

			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({
						json: {
							error: error.message,
						},
						pairedItem: {
							item: i,
						},
					});
					continue;
				}
				throw error;
			}
		}

		return [returnData];
	}
}