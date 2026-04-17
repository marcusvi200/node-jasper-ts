# node-jasper-ts

JasperReports within Node.js using typescript

## Adaptation

Adapting the package: node-jasper: [node-jasper](https://github.com/agmoyano/node-jasper)

## News

### 3.0.0
Now you can use as Module inside of NestJS

*app.module.ts*
```
import { Module } from '@nestjs/common';
import { JasperModule } from 'node-jasper-ts/nest';

@Module({
  imports: [
    JasperModule.forRoot({
      drivers: {
        oracle: {
          path: 'jar/dist/ojdbc11g.jar',
          class: 'oracle.jdbc.driver.OracleDriver',
          type: 'oracle'
        }
      },
      conns: {
        default: {
          user: Utils.env.DB_USERNAME!,
          pass: Utils.env.DB_PASSWORD!,
          jdbc: `jdbc:oracle:thin:@${Utils.env.DB_HOST}:${Utils.env.DB_PORT}:${Utils.env.DB_SERVICENAME}`,
          driver: 'oracle'
        }
      },
      tmpPath: 'temp/tmp',
      defaultConn: 'default',
      java: ["-Djava.awt.headless=true", "-Xms256m", "-Xmx512m"],
    }),
  ],
  controllers: [],
  providers: [],
})
export class AppModule { }
```

*report.controller.ts*
```
import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ReportService } from './report.service';

@Controller('report')
export class ReportController {

    constructor(
        private readonly reportService: ReportService
    ) { }

    @Get('params/:idReport')
    getParams(@Param('idReport') idReport: number) {
        return this.reportService.getParams(idReport);
    }

    @Post('generate/:idReport')
    generateReport(@Param('idReport') idReport: number, @Body() body: { type: string, data: { [key: string]: any } }) {
        return this.reportService.generateReport(idReport, body.type, body.data);
    }

}
```

*report.service.ts*
```
import { HttpException, HttpStatus, Injectable, StreamableFile } from '@nestjs/common';
import { JasperService } from 'node-jasper-ts/nest';

@Injectable()
export class ReportService {

    // Base folder where report subfolders are located
    private readonly baseFolder: string = `${process.cwd()}/jrxml/files`;

    constructor(private readonly jasperService: JasperService) { }

    // List of JRXML parameters in the folder
    async getParams(idReport: number) {
        const folder = `${this.baseFolder}/${idReport}`;

        let params = await this.jasperService.getParameters({ dirReport: folder, grouped: true });

        return params;
    }

    // Generate the report
    async generateReport(idReport: number, type: string = 'pdf', params?: { [key: string]: any }) {
        try {
            const folder = `${this.baseFolder}/${idReport}`;

            const report = await this.jasperService.createReport({ conn: 'default', dirReport: folder });

            await report.loadParameters(params);

            switch (type.toLowerCase()) {
                case 'pdf':
                    return new StreamableFile(await report.pdf());
                case 'xlsx':
                    return new StreamableFile(await report.xlsx());
                case 'docx':
                    return new StreamableFile(await report.docx());
                case 'pptx':
                    return new StreamableFile(await report.pptx());
                case 'html':
                    return new StreamableFile(await report.html());
                case 'xml':
                    return new StreamableFile(await report.xml(false));
                default:
                    throw new Error(`Incompatible type`);
            }
        } catch (error) {
            throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

}
```

### 2.0.0
Updated to Node 22

### 1.2.6
Now you can load your own jars using string 'path'. (Suggestion from [Murilo Menegasso](https://github.com/murilomenegasso))

** Attention!! **
Inside the folder there must be the complete "lib" folder, which appears in the package and there must be a "dist" folder, which is the place where you must store the drivers you need, all in 'jar'. We strongly recommend using this format.

## Install

Install via npm:

```
npm install --save node-jasper-ts
```

To use it inside your project just do:

```
import { JasperCompile, JasperConfig, JasperCompileFolder, JasperParameters, JasperParametersFolder } from 'node-jasper-ts';
import * as fs from 'node:fs/promises';
import * as dotenv from 'dotenv';
dotenv.config();

var jasperReport = JasperConfig({
    reports: {
        'main': {
            jrxml: 'jrxml/test/rel_teste.jrxml',
            conn: 'default',
        },
        'sub': {
            jrxml: 'jrxml/test/rel_teste_subreport1.jrxml',
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
            user: 'USERDB',
            pass: 'PASSWORD',
            jdbc: 'jdbc:oracle:thin:@266.266.262.260:82821:ORCL',
            driver: 'oracle'
        }
    },
    defaultConn: 'default',
    tmpPath: 'jrxml/test',
    java: ["-Djava.awt.headless=true"]
})

jasperReport.init().then(async ()=>{
    await jasperReport.compileJRXMLInDirSync({ dir: "jrxml/test" });

    jasperReport.docx({
        report: 'main',
        data: {
            id: 1
        },
    }).then((result) => {
        await fs.writeFileSync("exported/test.docx", Buffer.from(result, 'binary'));
        console.log("Arquivo gerado com sucesso!");
        process.exit(0);
    }).catch((err: any) => {
        console.log(err);
        process.exit(1);
    })
}).catch((error) => {
    console.error(error);
});

```

Where _options_ is an object with the following signature:

```
options: {
	path: , //Path to jasperreports-x.x.x directory (from jasperreports-x.x.x-project.tar.gz)
	reports: {
 		// Report Definition
 		"name": {
 			jasper: , //Path to jasper file,
 			jrxml: , //Path to jrxml file,
 			conn: , //Connection name, definition object or false (if false defaultConn won't apply or if ´in_memory_json´ then you can pass an JSON object in the ´dataset´ property for in-memory data sourcing instead of database access
 		}
 	},
 	drivers: {
 		// Driver Definition
 		"name": {
 			path: , //Path to jdbc driver jar
 			class: , //Class name of the driver (what you would tipically place in "Class.forName()" in java)
 			type: //Type of database (mysql, postgres)
 		}
 	},
 	conns: {
 		// Connection Definition
 		"name": {
 			host: , //Database hostname or IP
 			port: , //Database Port
 			dbname: , //Database Name
 			user: , //User Name
 			pass: , //User Password
 			jdbc: , //jdbc connection String. If this is defined, every thing else but user and pass becomes optional.
 			driver: //name or definition of the driver for this conn
 		}
 	},
 	defaultConn: ,//Default Connection name
	java: ,//Array of java options, for example ["-Djava.awt.headless=true"]
	javaInstnace: //Instance of node-java, if this is null, a new instance will be created and passed in 'java' property
 }
 ```

## API

* **java**

	Instance of *node-java* that we are currently running.

* **async compileJRXMLInDirSync({ dir, dstFolder? })**

	Compiles all jrxml files into a jasper file within the specified folder, saving to the temp folder.

* **compileAllSync(dstFolder?)**

	Compiles all jrxml of the configuration into a jasper file inside the temp folder.

* **compileSync(jrxmlFile, dstFolder?)**

	Compiles a jrxml file into a jasper file, saving in the temp folder.
    
* **getParametersSync({ jrxml?, jasper? })**

	Gets the file parameters, either jasper or jrxml.

* **async getParametersAll({ path, grouped})**

	Gets the file parameters, either jasper or jrxml.

* **add(name, report)**

  Add a new _report_ definition identified by _name_.

  In report definition one of _jasper_ or _jrxml_ must be present.

* **async pdf(report)**

  Alias for _export(report, 'pdf')_

* **async html(report)**

  Alias for _export(report, 'html')_

* **async xml(report)**

  Alias for _export(report, 'xml', embeddingImages boolean)_

* **async docx(report)**

  Alias for _export(report, 'docx')_

* **async xlsx(report)**

  Alias for _export(report, 'xlsx')_

* **async pptx(report)**

  Alias for _export(report, 'pptx')_

* **async export(report, format)**

  Returns the compiled _report_ in the specified _format_.

  report can be of any of the following types:

  * A string that represents report's name. No data is supplied.. _defaultConn_ will be applied to get data with reports internal query.

  * An object that represents report's definition. No data is supplied.. if _conn_ is not present, then _defaultConn_ will be applied to get data with reports internal query.

  * An object that represents reports, data and properties to override for this specific method call.

    ```
    {
      report: , //name, definition or an array with any combination of both
      data: {}, //Data to be applied to the report. If there is an array of reports, data will be applied to each.
      override: {} //properties of report to override for this specific method call.
      dataset: {} //an object to be JSON serialized and passed to the Report as fields instead of parameters (see the example for more info)
	  query: '' // string to pass to jasperreports to query on the dataset
 	}
 	```
  * An array with any combination of the three posibilities described before.

  * A function returning any combination of the four posibilities described before.

## Example

```
import * as express from 'express';
var app = express();

    var jasper = JasperConfig({
                reports: {
                    'main': {
                        jrxml: 'jrxml/test/rel_teste.jrxml',
                        conn: 'default',
                    }
                },
                drivers: {
                    'oracle': {
                        path: 'jar/dist/ojdbc11g.jar',
                        class: 'oracle.jdbc.driver.OracleDriver',
                        type: 'oracle'
                    }
                },
                conns: {
                    'default': {
                        user: 'USERDB',
                        pass: 'PASSWORD',
                        jdbc: 'jdbc:oracle:thin:@266.266.262.260:12821:ORCL',
                        driver: 'oracle'
                    }
                },
                path: `${process.cwd()}/jar`,
                defaultConn: 'default',
                tmpPath: 'jrxml/test',
                java: ["-Djava.awt.headless=true"]
    });

    app.get('/pdf', async (req, res, next) => {
        await jasper.init();
        await jasper.compileJRXMLInDirSync("jrxml/test");

        //beware of the datatype of your parameter.
        var report = {
            report: 'main',
            data: {
                id: parseInt(req.query.id, 10)
                secundaryDataset: jasper.toJsonDataSource({
                    data: ...
                },'data')
            }
            dataset: //main dataset
        };

        var pdf = await jasper.pdf(report);

        res.set({
            'Content-type': 'application/pdf',
            'Content-Length': pdf.length
        });

        res.send(pdf);
    });

	app.listen(3000);
```

That's It!.