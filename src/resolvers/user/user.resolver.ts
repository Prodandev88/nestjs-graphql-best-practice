import {
	Resolver,
	Query,
	Mutation,
	Args,
	Subscription,
	Context,
	ResolveProperty,
	Parent
} from '@nestjs/graphql'
import { InjectRepository } from '@nestjs/typeorm'
import { MongoRepository, getMongoRepository } from 'typeorm'
import { ApolloError } from 'apollo-server-core'
import * as uuid from 'uuid'

import {
	CreateUserInput,
	UpdateUserInput,
	LoginResponse,
	LoginUserInput
} from '../../models/user.entity'
import { User, UserPermission, History } from '../../models'
import { AuthService } from '../../auth/auth.service'
import { MailService } from '../../utils/mail/mail.service'
import { UserPermissionResolver } from '../userPermission/userPermission.resolver'
import { HistoryResolver } from '../history/history.resolver'
import { CreateUserPermissionInput, Result, SearchInput } from '../../graphql'

@Resolver('User')
export class UserResolver {
	constructor(
		@InjectRepository(User)
		private readonly userRepository: MongoRepository<User>,
		private readonly authService: AuthService,
		private readonly mailService: MailService,
		private readonly userPermissionResolver: UserPermissionResolver,
		private readonly historyResolver: HistoryResolver
	) {}

	// COMPLETE:
	@Query(() => String)
	async hello(): Promise<string> {
		return uuid.v1()
		// return await 'world'
	}

	// PENDING:
	@Query()
	async search(
		@Args('conditions') conditions: SearchInput,
		@Args('type') type: string
	): Promise<Result[]> {
		let result

		const { select, where, order, skip, take } = conditions

		// console.log(conditions, order)

		// const createdAt = { $gte: 0, $lte: new Date().getTime() }

		result = await getMongoRepository(type).find({
			where: where[type] && JSON.parse(JSON.stringify(where[type])),
			order: order && JSON.parse(JSON.stringify(order)),
			skip,
			take
		})

		// console.log(result)

		if (result.length === 0) {
			throw new ApolloError('Not Found', '404', {})
		}

		return result
	}

	// COMPLETE:
	@Query(() => User)
	async me(@Context('currentUser') currentUser: User) {
		return currentUser
	}

	// COMPLETE:
	@Query(() => [User])
	async users(
		@Args('offset') offset: number,
		@Args('limit') limit: number
	): Promise<User[]> {
		const users = await this.userRepository.find({
			where: { email: { $nin: ['nhocpo.juzo@gmail.com'] } },
			order: { createdAt: -1 },
			skip: offset,
			take: limit,
			cache: true // 1000: 60000 / 1 minute
		})

		return users
	}

	// COMPLETE:
	@Query(() => User)
	async user(@Args('_id') _id: string): Promise<User> {
		try {
			const user = await this.userRepository.findOne({ _id })

			if (!user) {
				throw new ApolloError('Not Found: User', '404', {})
			}

			return user
		} catch (error) {
			throw new ApolloError(error, '500', {})
		}
	}

	// COMPLETE:
	@Mutation(() => User)
	async createUser(
		@Args('input') input: CreateUserInput,
		@Context('pubSub') pubSub
	): Promise<User> {
		try {
			const { firstName, lastName, email, password, gender, sites } = input

			const existedUser = await this.userRepository.findOne({ email })

			if (existedUser) {
				throw new ApolloError('Conflict: Username', '409', {})
			}

			const user = new User()
			user.firstName = firstName
			user.lastName = lastName
			user.email = email
			user.password = password
			user.gender = gender

			const createdUser = await this.userRepository.save(user)

			sites.map(async item => {
				const { siteId, permissions } = item

				const createUserPermissionInput = new CreateUserPermissionInput()

				createUserPermissionInput.userId = createdUser._id
				createUserPermissionInput.siteId = siteId
				createUserPermissionInput.permissions = permissions

				this.userPermissionResolver.createUserPermission(
					createUserPermissionInput
				)
			})

			pubSub.publish('userCreated', { userCreated: createdUser })

			return createdUser
		} catch (error) {
			throw new ApolloError(error, '500', {})
		}
	}

	// COMPLETE:
	@Mutation(() => Boolean)
	async updateUser(
		@Args('_id') _id: string,
		@Args('input') input: UpdateUserInput
	): Promise<boolean> {
		try {
			const { firstName, lastName, password, gender, sites } = input

			const user = await this.userRepository.findOne({ _id })

			if (!user) {
				throw new ApolloError('Not Found: User', '404', {})
			}

			sites.map(async item => {
				const { siteId, permissions } = item

				const existedUserPermission = await getMongoRepository(
					UserPermission
				).findOne({
					userId: user._id,
					siteId
				})

				if (existedUserPermission) {
					existedUserPermission.permissions = permissions

					return getMongoRepository(UserPermission).save(existedUserPermission)
				} else {
					const createUserPermissionInput = new CreateUserPermissionInput()

					createUserPermissionInput.userId = user._id
					createUserPermissionInput.siteId = siteId
					createUserPermissionInput.permissions = permissions

					return this.userPermissionResolver.createUserPermission(
						createUserPermissionInput
					)
				}
			})

			user.firstName = firstName
			user.lastName = lastName
			user.password = await user.hashPassword(password)
			user.gender = gender

			return (await this.userRepository.save(user)) ? true : false
		} catch (error) {
			throw new ApolloError(error, '500', {})
		}
	}

	// COMPLETE:
	@Mutation(() => Boolean)
	async deleteUser(@Args('_id') _id: string): Promise<boolean> {
		try {
			const user = await this.userRepository.findOne({ _id })

			if (!user) {
				throw new ApolloError('Not Found: User', '404', {})
			}

			user.isActive = false

			return (await this.userRepository.save(user)) ? true : false
		} catch (error) {
			throw new ApolloError(error, '500', {})
		}
	}

	// COMPLETE:
	@Mutation(() => Boolean)
	async deleteUsers(): Promise<boolean> {
		try {
			return (await this.userRepository.deleteMany({
				email: { $nin: ['nhocpo.juzo@gmail.com'] }
			}))
				? true
				: false
		} catch (error) {
			throw new ApolloError(error, '500', {})
		}
	}

	// COMPLETE:
	@Mutation(() => LoginResponse)
	async login(
		@Args('input') input: LoginUserInput,
		@Context('req') req: any
	): Promise<LoginResponse> {
		const { email, password } = input

		const loginResponse = await this.authService.tradeToken(email, password)

		return loginResponse
	}

	// COMPLETE:
	@Mutation(() => Boolean)
	async lockAndUnlockUser(
		@Args('_id') _id: string,
		@Args('reason') reason: string,
		@Context('currentUser') currentUser: User
	): Promise<boolean> {
		try {
			const user = await this.userRepository.findOne({ _id })

			if (!user) {
				throw new ApolloError('Not Found: User', '404', {})
			}

			user.reason = !user.isLocked ? reason : ''
			user.isLocked = !user.isLocked

			// console.log(currentUser)

			const history = new History()
			history.userId = currentUser._id
			history.description = user.isLocked
				? `${currentUser.email} locked ${user.email} because ${reason}`
				: `${currentUser.email} unlocked ${user.email}`

			this.historyResolver.createHistory(history)

			return (await this.userRepository.save(user)) ? true : false
		} catch (error) {
			throw new ApolloError(error, '500', {})
		}
	}

	// COMPLETE:
	@Mutation(() => Boolean)
	async changePassword(
		@Args('_id') _id: string,
		@Args('currentpassword') currentpassword: string,
		@Args('password') password: string
	): Promise<boolean> {
		const user = await this.userRepository.findOne({ _id })

		console.log(currentpassword, password)

		if (!user) {
			throw new ApolloError('Not Found: User', '404', {})
		}

		if (!(await user.matchesPassword(currentpassword))) {
			throw new ApolloError('missingCurrentPassword', '400', {})
		}

		if (await user.matchesPassword(password)) {
			throw new ApolloError(
				'Your new password must be different from your previous password.',
				'400',
				{}
			)
		}

		user.password = await user.hashPassword(password)

		return (await this.userRepository.save(user)) ? true : false
	}

	// COMPLETE:
	@Mutation(() => Boolean)
	async forgotPassword(
		@Args('email') email: string,
		@Context('req') req: any
	): Promise<boolean> {
		const user = await this.userRepository.findOne({
			email
		})

		if (!user) {
			throw new ApolloError('Not Found: User', '404', {})
		}

		const date = new Date()

		user.resetPasswordToken = uuid.v1()
		user.resetPasswordExpires = date.setHours(date.getHours() + 1) // 1 hour

		await this.userRepository.save(user)

		return (await this.mailService.sendMail(
			user.email,
			req,
			user.resetPasswordToken
		))
			? true
			: false
	}

	// COMPLETE:
	@Mutation(() => Boolean)
	async resetPassword(
		@Args('resetPasswordToken') resetPasswordToken: string,
		@Args('password') password: string
	) {
		const user = await this.userRepository.findOne({
			resetPasswordToken
		})

		if (!user) {
			throw new ApolloError('Not Found: User', '404', {})
		}

		if (user.resetPasswordExpires < Date.now()) {
			throw new ApolloError('Invalid ResetPasswordToken', '498', {})
		}

		user.password = await user.hashPassword(password)
		user.resetPasswordToken = null
		user.resetPasswordExpires = null

		return (await this.userRepository.save(user)) ? true : false
	}

	// COMPLETE:
	@Subscription(() => Object, {
		filter: (payload: any, variables: any) => {
			// console.log('payload', payload)
			// console.log('variables', variables)
			// return payload.menuPublishByOrder.currentsite === variables.currentsite
			return true
		}
	})
	async userCreated(@Context('pubSub') pubSub: any): Promise<User> {
		return pubSub.asyncIterator('userCreated')
	}

	// COMPLETE:
	@ResolveProperty(() => String)
	async fullName(@Parent() user: User): Promise<string> {
		const { firstName, lastName } = user
		return `${firstName} ${lastName}`
	}
}
