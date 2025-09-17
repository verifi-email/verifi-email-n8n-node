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
		icon: 'file:VerifiEmailPics/verifiemail.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"]}}',
		description: 'Email validation using VerifiEmail API',
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