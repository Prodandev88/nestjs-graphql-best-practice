import { Resolver, ResolveProperty } from '@nestjs/graphql'

@Resolver('Result')
export class ResultResolver {
	@ResolveProperty()
	__resolveType(obj) {
		console.log(obj)
		if (obj.email) {
			console.log('ccc')
			return 'User'
		}
		if (obj.name) {
			console.log('bbb')
			return 'Site'
		}
		return null
	}
}
