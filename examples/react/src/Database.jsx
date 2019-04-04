import * as RxDB from '../../../';

RxDB.QueryChangeDetector.enableDebugging();

RxDB.plugin(require('pouchdb-adapter-idb'));
RxDB.plugin(require('pouchdb-adapter-http')); //enable syncing over http

const collections = [
    {
        name: 'heroes',
        schema: require('./Schema.js').default,
        // methods: {
        //     hpPercent() {
        //         return this.hp / this.maxHP * 100;
        //     }
        // },
        // sync: true
    }
];

console.log('i am silly');
window.silly = collections;

const syncURL = 'http://' + window.location.hostname + ':10102/';
console.log('host: ' + syncURL);

let dbPromise = null;

const dbConnectSubscribers = [];

export const onDbConnect = fn => {
    dbConnectSubscribers.push(fn);
}

const dbConnectingSubscribers = [];

export const onDbConnecting = fn => {
    dbConnectingSubscribers.push(fn);
}

const dbDestroySubscribers = [];

export const onDbDestroy = fn => {
    dbDestroySubscribers.push(fn);
}

const dbDestroyingSubscribers = [];

export const onDbDestroying = fn => {
    dbDestroyingSubscribers.push(fn);
}

const _create = async () => {
    dbConnectingSubscribers.forEach(fn => {
        if (typeof fn === 'function') {
            fn();
        }
    });

    console.log('DatabaseService: creating database..');
    const db = await RxDB.create({name: 'heroesreactdb', adapter: 'idb', password: 'myLongAndStupidPassword'});
    console.log('DatabaseService: created database');
    window['db'] = db; // write to window for debugging

    // show leadership in title
    // db.waitForLeadership().then(() => {
    //     console.log('isLeader now');
    //     document.title = '♛ ' + document.title;
    // });

    // create collections
    console.log('DatabaseService: create collections');
    await Promise.all(collections.map(colData => db.collection(
        // JSON.parse(JSON.stringify(colData))
        colData
    )));

    // hooks
    // console.log('DatabaseService: add hooks');
    // db.collections.heroes.preInsert(docObj => {
    //     const { color } = docObj;
    //     return db.collections.heroes.findOne({color}).exec().then(has => {
    //         if (has != null) {
    //             alert('another hero already has the color ' + color);
    //             throw new Error('color already there');
    //         }
    //         return db;
    //     });
    // });

    // sync
    console.log('DatabaseService: sync');
    // collections.filter(col => col.sync).map(col => col.name).map(colName => db[colName].sync({
    //     remote: syncURL + colName + '/'
    // }));

    dbConnectSubscribers.forEach(fn => {
        if (typeof fn === 'function') {
            fn();
        }
    });

    return db;
};

export const get = () => {
    if (!dbPromise)
        dbPromise = _create();
    return dbPromise;
}

export const destroy = () => {
    return new Promise((resolve, reject) => {
        if (!dbPromise) {
            reject(new Error('You are not connected to a db.'));
        } else {
            dbDestroyingSubscribers.forEach(fn => {
                if (typeof fn === 'function') {
                    fn();
                }
            });

            dbPromise
                .then(db => {
                    return db.destroy()
                })
                .then(() => {
                    dbPromise = null;
                    dbDestroySubscribers.forEach(fn => {
                        if (typeof fn === 'function') {
                            fn();
                        }
                    });                    
                });
        }
    });
}
