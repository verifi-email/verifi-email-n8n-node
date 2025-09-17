import {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class VerifiEmailApi implements ICredentialType {
	name = 'verifiEmailApi';
	displayName = 'VerifiEmail API';
	documentationUrl = 'https://docs.verifi.email/authentication';
	icon = 'file:verifiemail.svg';
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

    authenticate: IAuthenticateGeneric = {

            type: 'generic',
            properties: {
                    qs: {
                            'token': '={{$credentials.apiKey}}',
                    },
            },
    };
    test: ICredentialTestRequest = {
            request: {
                    baseURL: 'https://api.verifi.email',
                    url: '/check',
                    method: 'GET',
                    qs: {
                            'token': '={{$credentials.apiKey}}'
                    },
            },
    };
}
