import { DynamicModule } from '@nestjs/common';
import { optionsJasperInitial } from './interfaces/jasper-options.interface';
export declare class JasperModule {
    static forRoot(options: optionsJasperInitial): DynamicModule;
}
