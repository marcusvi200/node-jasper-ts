import { DynamicModule } from '@nestjs/common';
import { optionsJasperInitial } from './interfaces/jasper-options.interface';
export declare class JasperModule {
    /**
     * Registers the Jasper service globally in the Nest application.
     *
     * @param options Base Jasper configuration shared by all reports created through the service.
     */
    static forRoot(options: optionsJasperInitial): DynamicModule;
}
//# sourceMappingURL=jasper.module.d.ts.map