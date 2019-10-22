import { NestFactory } from '@nestjs/core'
import { AppModule } from './app.module'
import { Logger } from '@nestjs/common'
import { createConnection, getMetadataArgsStorage } from 'typeorm'
import { express as voyagerMiddleware } from 'graphql-voyager/middleware'
import * as bodyParser from 'body-parser'
import * as helmet from 'helmet'
import * as compression from 'compression'
// import * as csurf from 'csurf'
// import * as rateLimit from 'express-rate-limit'
// import * as cookieParser from 'cookie-parser'
// import * as passport from 'passport'
// import * as fs from 'fs'
import chalk from 'chalk'

import { LoggerService } from './config/logger/logger.service'
import { ValidationPipe } from './common/pipes/validation.pipe'
import { LoggingInterceptor } from './common/interceptors/logging.interceptor'
import { TimeoutInterceptor } from './common/interceptors/timeout.interceptor'
import { LoggerMiddleware } from './common/middleware/logger.middleware'

import { TasksModule } from './shared/tasks/tasks.module'
import { TasksService } from './shared/tasks/tasks.service'
import { timeout, interval, cron } from './shared/tasks'
import { EmailModule } from './resolvers/email/email.module'
import { EmailResolver } from './resolvers/email/email.resolver'

import config from './config.orm'
import { logger } from './common/wiston'

import { NODE_ENV, DOMAIN, PORT, END_POINT, VOYAGER } from './environments'

declare const module: any

// connect database
createConnection({
	...config,
	type: 'mongodb',
	entities: getMetadataArgsStorage().tables.map(tbl => tbl.target),
	synchronize: true,
	useNewUrlParser: true,
	useUnifiedTopology: true
})
	.then(data => {
		logger.info(data)
		Logger.log(`☁️  Database connected`, 'TypeORM')
	})
	.catch(err => {
		logger.error(err)
		Logger.error(`❌  Database connect error, ${err}`, 'TypeORM')
	})

async function bootstrap() {
	try {
		const app = await NestFactory.create(AppModule, {
			// httpsOptions: {
			// 	key: fs.readFileSync(`./ssl/product/server.key`),
			// 	cert: fs.readFileSync(`./ssl/product/server.crt`)
			// },
			logger: false
		})

		// application context
		const tasksService = app
			.select(TasksModule)
			.get(TasksService, { strict: true })
		const emailResolver = app
			.select(EmailModule)
			.get(EmailResolver, { strict: true })

		// tasks
		tasksService.Timeout()
		// timeout()
		// interval()
		// cron()

		// adapter for e2e testing
		const httpAdapter = app.getHttpAdapter()

		app.useLogger(app.get(LoggerService))

		// added security
		app.use(helmet())

		// body parser
		app.use(bodyParser.json({ limit: '50mb' }))
		app.use(
			bodyParser.urlencoded({
				limit: '50mb',
				extended: true,
				parameterLimit: 50000
			})
		)

		// compress
		app.use(compression())

		// cruf
		// app.use(csurf())

		// rateLimit
		// app.use(
		// 	rateLimit({
		// 		windowMs: 15 * 60 * 1000, // 15 minutes
		// 		max: 1, // limit each IP to 100 requests per windowMs
		// 		message:
		// 			'Too many request created from this IP, please try again after an hour'
		// 	})
		// )

		// passport
		// app.use(passport.initialize())

		// poggerMiddleware
		NODE_ENV !== 'testing' && app.use(LoggerMiddleware)

		// voyager
		process.env.NODE_ENV !== 'production' &&
			app.use(
				`/${VOYAGER!}`,
				voyagerMiddleware({
					endpointUrl: `/${END_POINT!}`
				})
			)

		// interceptors
		app.useGlobalInterceptors(new LoggingInterceptor())
		app.useGlobalInterceptors(new TimeoutInterceptor())

		// global nest setup
		app.useGlobalPipes(new ValidationPipe())

		app.enableShutdownHooks()

		// mail tracking
		app.use('/graphql/:id', (req, res, next) => {
			const { _id } = req.params
			// console.log(_id)
			emailResolver.openEmail(_id)
			next()
		})

		// size limit
		app.use('*', (req, res, next) => {
			const query = req.query.query || req.body.query || ''
			if (query.length > 2000) {
				throw new Error('Query too large')
			}
			next()
		})

		const server = await app.listen(PORT)

		// hot module replacement
		if (module.hot) {
			module.hot.accept(async () => {
				try {
					server.removeAllListeners('request', server)

					const app = await NestFactory.create(AppModule, {
						// httpsOptions: {
						// 	key: fs.readFileSync(`./ssl/product/server.key`),
						// 	cert: fs.readFileSync(`./ssl/product/server.crt`)
						// },
						logger: false
					})

					server.on('request', app.init())
				} catch (err) {
					console.log(err)
				}
			})
			module.hot.accept()
			module.hot.dispose(() => app.close())
		}

		NODE_ENV !== 'production'
			? Logger.log(
					`🚀  Server ready at http://${DOMAIN!}:${chalk
						.hex('#87e8de')
						.bold(`${PORT!}`)}/${END_POINT!}`,
					'Bootstrap'
			  )
			: Logger.log(
					`🚀  Server is listening on port ${chalk
						.hex('#87e8de')
						.bold(`${PORT!}`)}`,
					'Bootstrap'
			  )

		NODE_ENV !== 'production' &&
			Logger.log(
				`🚀  Subscriptions ready at ws://${DOMAIN!}:${chalk
					.hex('#87e8de')
					.bold(`${PORT!}`)}/${END_POINT!}`,
				'Bootstrap'
			)
	} catch (error) {
		logger.error(error)
		Logger.error(`❌  Error starting server, ${error}`, 'Bootstrap')
		process.exit()
	}
}
bootstrap()
