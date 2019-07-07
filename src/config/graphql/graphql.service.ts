import { Injectable, Logger } from '@nestjs/common'
import { GqlOptionsFactory, GqlModuleOptions } from '@nestjs/graphql'
import { MemcachedCache } from 'apollo-server-cache-memcached'
import { UserService } from '../../modules/user/user.service'
import { PubSub } from 'graphql-subscriptions'
import { join } from 'path'
import { ForbiddenError, AuthenticationError } from 'apollo-server-core'
import { UserPermissionService } from '../../modules/userPermission/userPermission.service'

const pubSub = new PubSub()

@Injectable()
export class GraphqlService implements GqlOptionsFactory {
	constructor(
		private readonly userService: UserService,
		private readonly userPermissionService: UserPermissionService
	) {}

	async createGqlOptions(): Promise<GqlModuleOptions> {
		const directiveResolvers = {
			isAuthenticated: (next, source, args, ctx) => {
				const { currentUser } = ctx

				if (!currentUser) {
					throw new AuthenticationError('You must be logged in!')
				}

				return next()
			},
			hasPermission: async (next, source, args, ctx) => {
				const { currentUser } = ctx

				if (!currentUser) {
					throw new AuthenticationError('You are not authenticated!')
				}

				const { permission } = args

				const userPermission = await this.userPermissionService.find({
					userId: currentUser._id
				})

				// console.log('TCL: GraphqlService -> userPermission', userPermission)

				let status = false

				userPermission.map(item => {
					item.permissions.map(item => {
						if (item.code === permission) {
							status = true
						}
					})
				})

				if (status === false) {
					throw new Error(`You are not authorized!`)
				}

				return next()
			}
		}

		return {
			typePaths: ['./**/*.graphql'],
			definitions: {
				path: join(process.cwd(), 'src/graphql.ts'),
				outputAs: 'class'
			},
			directiveResolvers,
			context: async ({ req, res, connection }) => {
				if (connection) {
					return {
						req: connection.context,
						pubSub
					}
				}

				let currentUser = ''

				const { token } = req.headers

				if (token) {
					currentUser = await this.userService.findOneByToken(token)
				}

				return {
					req,
					res,
					pubSub,
					currentUser
				}
			},
			formatError: err => {
				// console.log(err)
				Logger.log('❌ ' + JSON.stringify(err), 'Error')
				return err
			},
			formatResponse: err => {
				// console.log(err)
				return err
			},
			debug: false,
			subscriptions: {
				onConnect: (connectionParams, webSocket, context) => {
					console.log('🔗 Connected to websocket')
				}
			},
			persistedQueries: {
				cache: new MemcachedCache(
					['memcached-server-1', 'memcached-server-2', 'memcached-server-3'],
					{ retries: 10, retry: 10000 } // Options
				)
			},
			installSubscriptionHandlers: true,
			introspection: true,
			playground: {
				settings: {
					'editor.cursorShape': 'line', // possible values: 'line', 'block', 'underline'
					'editor.fontFamily': `'Source Code Pro', 'Consolas', 'Inconsolata', 'Droid Sans Mono', 'Monaco', monospace`,
					'editor.fontSize': 14,
					'editor.reuseHeaders': true, // new tab reuses headers from last tab
					'editor.theme': 'dark', // possible values: 'dark', 'light'
					'general.betaUpdates': false,
					'queryPlan.hideQueryPlanResponse': false,
					'request.credentials': 'include', // possible values: 'omit', 'include', 'same-origin'
					'tracing.hideTracingResponse': true
				}
			}
		}
	}
}
