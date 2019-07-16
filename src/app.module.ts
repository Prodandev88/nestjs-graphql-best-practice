import { Module, CacheModule } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { GraphQLModule } from '@nestjs/graphql'
import { GraphqlModule } from './config/graphql/graphql.module'
import { GraphqlService } from './config/graphql/graphql.service'
import { TypeormModule } from './config/typeorm/typeorm.module'
import { TypeormService } from './config/typeorm/typeorm.service'
import { CacheService } from './config/cache/cache.service'
import { UserModule } from './modules/user/user.module'
import { DataloaderModule } from './shared/dataloader/dataloader.module'
import { SiteModule } from './modules/site/site.module'
import { MenuModule } from './modules/menu/menu.module'
import { PermissionModule } from './modules/permission/permission.module'
import { UserPermissionModule } from './modules/userPermission/userPermission.module'
import { OrderModule } from './modules/order/order.module'
import { HistoryModule } from './modules/history/history.module'
import { ShopModule } from './modules/shop/shop.module';
@Module({
	imports: [
		GraphQLModule.forRootAsync({
			useClass: GraphqlService
		}),
		TypeOrmModule.forRootAsync({
			useClass: TypeormService
		}),
		CacheModule.registerAsync({
			useClass: CacheService
		}),
		UserModule,
		GraphqlModule,
		TypeormModule,
		DataloaderModule,
		SiteModule,
		PermissionModule,
		MenuModule,
		UserPermissionModule,
		OrderModule,
		HistoryModule,
		ShopModule
	]
})
export class AppModule {}
