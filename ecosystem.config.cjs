module.exports = {
	apps: [
		{
			name: 'coati-dev',
			script: 'build/index.js',
			cwd: '/opt/coati/dev',
			env_file: '/opt/coati/dev/.env',
			env: {
				PORT: 3001,
				NODE_ENV: 'production'
			}
		},
		{
			name: 'coati-prod',
			script: 'build/index.js',
			cwd: '/opt/coati/prod',
			env_file: '/opt/coati/prod/.env',
			env: {
				PORT: 3000,
				NODE_ENV: 'production'
			}
		}
	]
};
