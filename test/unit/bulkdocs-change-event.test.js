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
import assert from 'assert';
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
                'isHappy': {
                    'type': 'boolean',
                    'default': true
                },
            },
        },
    }
];

describe('bulkdocs-change-event.test.js', () => {
    it('subcribed RxDB change handlers should execute when changes are ' +
        'initiated via a bulkDocs() call', async () => {
        // RxDB.QueryChangeDetector.enableDebugging();
        RxDB.plugin(require('pouchdb-adapter-idb'));
        // RxDB.plugin(require('pouchdb-adapter-http'));

        // generate a random database-name
        const dbName = util.randomCouchString(10);

        // create a database
        const db = await RxDB.create({
            name: dbName,
            adapter: 'idb',
            password: 'myLongAndStupidPassword'
        });

        await Promise.all(
            collections.map(
                colData => db.collection(
                    JSON.parse(JSON.stringify(colData))
                )
            )
        );

        const data = [
            {
                _id: 'larry',
                isHappy: true,
            },
            {
                _id: 'moe',
                isHappy: true,
            },
            {
                _id: 'curley',
                isHappy: true,
            },
        ];

        let pouchDbChanges = 0;
        let RxDBChanges = 0;

        db.heroes.pouch
            .changes({
                live: true,
                since: 'now',
            })
            .on('change', () => pouchDbChanges++);

        db.heroes.$.subscribe(() => RxDBChanges++);

        db.heroes.pouch.bulkDocs(data);
        
        await new Promise(resolve => {
            setTimeout(() => resolve(), 1000);
        });

        console.log('Checking if pouchDB change handlers fired.');
        assert.equal(pouchDbChanges, 3);

        console.log('Checking if RxDB change handlers fired.');
        assert.equal(RxDBChanges, 3);
    });
});
