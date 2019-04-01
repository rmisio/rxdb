# RxDB React example
This repos is the tweaked React example from the main repo reproduces this bug:
https://github.com/pubkey/rxdb/issues/939

Instructions:
- `git clone` this repo
- `npm install` in the root
- `cd examples/react`
- `npm install`

At the bottom of the screen will be a `Disconnect fromm Db` button. Click it to disconnect. Now you will have a `Connect to Db` button. Click it and then in your JS console notice the exception noted in the bug.