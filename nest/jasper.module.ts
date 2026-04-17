import { Module, DynamicModule, Global } from '@nestjs/common';
import { JasperService } from './jasper.service';
import { optionsJasperInitial } from './interfaces/jasper-options.interface';

@Global()
@Module({})
export class JasperModule {
  /**
   * Registers the Jasper service globally in the Nest application.
   *
   * @param options Base Jasper configuration shared by all reports created through the service.
   */
  static forRoot(options: optionsJasperInitial): DynamicModule {
    return {
      module: JasperModule,
      providers: [
        {
          provide: 'JASPER_OPTIONS',
          useValue: options,
        },
        JasperService,
      ],
      exports: [JasperService],
    };
  }
}