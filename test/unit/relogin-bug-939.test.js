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
// import * as util from '../../dist/lib/util';

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
            // create a database
            db = await RxDB.create({
                name: 'heroesreactdb',
                adapter: 'idb',
                password: 'myLongAndStupidPassword'
            });

            // create a collection
            // const collection = await db.collection({
            //     name: 'mycollection',
            //     // schema: mySchema
            //     schema: require('./Schema.js').default,
            // });
            await Promise.all(
                collections.map(
                    colData => db.collection(
                        JSON.parse(JSON.stringify(colData))
                    )
                )
            );

            // // insert a document
            // await collection.insert({
            //     passportId: 'foobar',
            //     firstName: 'Bob',
            //     lastName: 'Kelso',
            //     age: 56
            // });

            // assert.equal(myDocument.age, 56);
            console.log('I\'m created!', (new Date()));
        }

        await connectDb();

        // await (
        //     new Promise((resolve, reject) => {
        //         setTimeout(() => {
        //             resolve();
        //         }, 5000);
        //     })
        // );

        await db.destroy();
        console.log('I\'m destroyed!', (new Date()));
        let exceptionOnConnect = null;

        // await (
        //     new Promise((resolve, reject) => {
        //         setTimeout(() => {
        //             resolve();
        //         }, 5000);
        //     })
        // );        

        // will throw exception:
        // Cannot read property '_rev' of undefined
        await connectDb()

        // clean up afterwards
        db.destroy();
    });
});
