/**
 * this is a template for a test.
 * If you found a bug, edit this test to reproduce it
 * and than make a pull-request with that failing test.
 * The maintainer will later move your test to the correct possition in the test-suite.
 *
 * To run this test do:
 * - 'npm run test:node' so it runs in nodejs
 * - 'npm run test:browser' so it runs in the browser
 */
// import assert from 'assert';
// import AsyncTestUtil from 'async-test-util';

import RxDB from '../../dist/lib/index';
import * as util from '../../dist/lib/util';

const collections = [
    {
        name: 'heroes',
        schema: {
            'title': 'hero schema',
            'description': 'describes a simple hero',
            'version': 0,
            'type': 'object',
            'properties': {
                'name': {
                    'type': 'string',
                    'primary': true
                },
                'color': {
                    'type': 'string'
                }
            },
            'required': ['color']
        }
    }
];

describe('relogin-bug-939.test.js', () => {
    it('should fail because it reproduces the bug', async () => {
        RxDB.QueryChangeDetector.enableDebugging();
        RxDB.plugin(require('pouchdb-adapter-idb'));
        RxDB.plugin(require('pouchdb-adapter-http'));

        // generate a random database-name
        // const name = util.randomCouchString(10);
        let db;

        const connectDb = async () => {
            const meName = util.randomCouchString(10);

            // create a database
            db = await RxDB.create({
                // name: 'heroesreactdb',
                name: meName,
                adapter: 'idb',
                password: 'myLongAndStupidPassword'
            });

            const collections = [];

            // create a collection
            // const collection = await db.collection({
            //     name: 'mycollection',
            //     // schema: mySchema
            //     schema: require('./Schema.js').default,
            // });
            await Promise.all(
                collections.map(
                    async colData => {
                        const myCol = await db.collection(
                            JSON.parse(JSON.stringify(colData))
                        );
                        collections.push(myCol);
                    }
                )
            );

            // insert a document
            await collections[0].insert({
                name: meName,
                color: 'orange billy',
            });

            // assert.equal(myDocument.age, 56);
            // console.log('I\'m created!', (new Date()));

            return db;
        };

        const db1 = await connectDb();
        const db2 = await connectDb();

        console.log('silly billy');
        window.silly = db1;
        window.silly = db2;
    });
});
