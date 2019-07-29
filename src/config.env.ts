const config = {
	development: {
		domain: 'devcloud3.digihcs.com',
		port: process.env.PORT,
		end_point: 'graphql',
		orm: {
			type: 'mongodb',
			url: 'mongodb://admin:chnirt1803@ds347467.mlab.com:47467/nest-graphql'
			// host: 'devcloud3.digihcs.com',
			// port: process.env.MONGO_PORT,
			// username: '',
			// password: '',
			// database: 'lunch4'
		}
	},
	production: {
		domain: 'devcloud3.digihcs.com',
		port: process.env.PORT,
		end_point: process.env.END_POINT || 'graphqllunch',
		orm: {
			type: 'mongodb',
			url: 'mongodb://admin:chnirt1803@ds347467.mlab.com:47467/nest-graphql'
			// host: 'devcloud3.digihcs.com',
			// port: 27017,
			// username: '',
			// password: '',
			// database: 'lunch4'
		}
	}
}

export default config[process.env.NODE_ENV || 'development']
