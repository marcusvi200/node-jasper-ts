"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var JasperModule_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.JasperModule = void 0;
const common_1 = require("@nestjs/common");
const jasper_service_1 = require("./jasper.service");
let JasperModule = JasperModule_1 = class JasperModule {
    static forRoot(options) {
        return {
            module: JasperModule_1,
            providers: [
                {
                    provide: 'JASPER_OPTIONS',
                    useValue: options,
                },
                jasper_service_1.JasperService,
            ],
            exports: [jasper_service_1.JasperService],
        };
    }
};
JasperModule = JasperModule_1 = __decorate([
    (0, common_1.Global)(),
    (0, common_1.Module)({})
], JasperModule);
exports.JasperModule = JasperModule;
//# sourceMappingURL=jasper.module.js.map