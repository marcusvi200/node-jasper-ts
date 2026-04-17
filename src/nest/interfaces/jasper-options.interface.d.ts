import { options_drivers, options_conns } from "../../index";
export interface optionsJasperInitial {
    path?: string;
    tmpPath?: string;
    drivers: {
        [key: string]: options_drivers;
    };
    conns: {
        [key: string]: options_conns;
    };
    defaultConn: string;
    java: string[];
    javaInstance?: any;
    debug?: 'ALL' | 'TRACE' | 'DEBUG' | 'INFO' | 'WARN' | 'ERROR' | 'FATAL' | 'OFF' | 'off';
}
