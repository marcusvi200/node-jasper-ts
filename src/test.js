"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const index_1 = require("./index");
const fs = __importStar(require("node:fs/promises"));
const dotenv = __importStar(require("dotenv"));
dotenv.config();
var jasperReport = (0, index_1.JasperConfig)({
    reports: {
        'main': {
            jrxml: 'jrxml/test/rel_teste.jrxml',
            conn: 'default',
        }
    },
    path: `${process.cwd()}/jar`,
    drivers: {
        'oracle': {
            path: 'jar/dist/ojdbc11g.jar',
            class: 'oracle.jdbc.driver.OracleDriver',
            type: 'oracle'
        }
    },
    conns: {
        'default': {
            user: process.env.ORACLE_JDBC_USER || '',
            pass: process.env.ORACLE_JDBC_PASS || '',
            jdbc: process.env.ORACLE_JDBC_URL || '',
            driver: 'oracle'
        }
    },
    defaultConn: 'default',
    tmpPath: 'jrxml/test',
    java: ["-Djava.awt.headless=true"]
});
jasperReport.init().then(async () => {
    await jasperReport.compileJRXMLInDirSync({ dir: "jrxml/test" });
    jasperReport.pdf({
        report: 'main',
        data: {
            id: 1
        },
    }).then(async (result) => {
        await fs.writeFile("exported/test.pdf", Buffer.from(result, 'binary'));
        console.log("Arquivo gerado com sucesso!");
        process.exit(0);
    }).catch((err) => {
        console.log(err);
        process.exit(1);
    });
}).catch((error) => {
    console.error(error);
});
//# sourceMappingURL=test.js.map