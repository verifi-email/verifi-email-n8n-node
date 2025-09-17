import {
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class VerifiEmailApi implements ICredentialType {
	name = 'verifiEmailApi';
	displayName = 'VerifiEmail API';
	documentationUrl = 'https://docs.verifi.email/authentication';
	properties: INodeProperties[] = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: {
				password: true,
			},
			default: '',
			required: true,
			description: 'Your VerifiEmail API key',
		},
	];
}