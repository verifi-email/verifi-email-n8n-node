import {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	NodeOperationError,
	IHttpRequestMethods,
	IRequestOptions,
	NodeConnectionType,
} from 'n8n-workflow';

export class VerifiEmail implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'VerifiEmail',
		name: 'verifiEmail',
		icon: { light:'file:verifiemail.svg',dark: 'file:verifiemail.svg'},
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"]}}',
		description: 'Email validation and domain health check using VerifiEmail API',
		defaults: {
			name: 'VerifiEmail',
		},
		inputs: [{ type: NodeConnectionType.Main }],
		outputs: [{ type: NodeConnectionType.Main }],
		credentials: [
			{
				name: 'verifiEmailApi',
				required: true,
			},
		],
		properties: [
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Validate Email',
						value: 'validateEmail',
						description: 'Validate a single email address',
						action: 'Validate an email address',
					},
					{
						name: 'Check Domain Health',
						value: 'checkDomainHealth',
						description: 'Check domain health and configuration',
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
				default: '',
				placeholder: 'user@example.org',
				description: 'The email address to validate',
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
				default: '',
				placeholder: 'example.org',
				description: 'The domain to check',
			},
			{
				displayName: 'Selector',
				name: 'selector',
				type: 'string',
				required: false,
				displayOptions: {
					show: {
						operation: ['checkDomainHealth'],
					},
				},
				default: 'google',
				placeholder: 'google',
				description: 'DKIM selector to check (optional)',
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		for (let i = 0; i < items.length; i++) {
			try {
				const operation = this.getNodeParameter('operation', i) as string;
				const credentials = await this.getCredentials('verifiEmailApi', i);

				if (operation === 'validateEmail') {
					const email = this.getNodeParameter('email', i) as string;

					if (!email) {
						throw new NodeOperationError(this.getNode(), 'Email address is required', {
							itemIndex: i,
						});
					}

					const options: IRequestOptions = {
						method: 'GET' as IHttpRequestMethods,
						url: 'https://api.verifi.email/check',
						qs: {
							token: credentials.apiKey as string,
							email: email,
						},
						json: true,
					};

					const response = await this.helpers.request(options);

					returnData.push({
						json: {
							email,
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
						token: credentials.apiKey as string,
						domain: domain,
					};

					// Add selector only if provided
					if (selector) {
						queryParams.selector = selector;
					}

					const options: IRequestOptions = {
						method: 'GET' as IHttpRequestMethods,
						url: 'https://api.verifi.email/v1/domain/check',
						qs: queryParams,
						json: true,
					};

					const response = await this.helpers.request(options);

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