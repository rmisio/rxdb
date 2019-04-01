import React, { Component } from 'react';
import './App.css';
import {
  onDbConnect,
  onDbDestroy,
  onDbConnecting,
  onDbDestroying,
  destroy,
  get as getDB,
} from './Database';
import HeroList from './hero-list/hero-list';
import HeroInsert from './hero-insert/hero-insert';

export default class extends Component {
  state = {
    connectingToDb: false,
    destroyingDb: false,
    dbConnected: false,
  }

  constructor(props) {
    super(props);
    this.handleConnectDb = this.handleConnectDb.bind(this);
    this.handleDisconnectDb = this.handleDisconnectDb.bind(this);
  }

  componentDidMount() {
    this.mounted = true
    ;
    onDbConnect(() => {
      if (!this.mounted) return;

      this.setState({
        connectingToDb: false,
        destroyingDb: false,
        dbConnected: true,
      });
    });
    
    onDbDestroy(() => {
      if (!this.mounted) return;

      this.setState({
        connectingToDb: false,
        destroyingDb: false,
        dbConnected: false,
      });
    });

    onDbConnecting(() => {
      if (!this.mounted) return;

      this.setState({
        connectingToDb: true,
      });
    });

    onDbDestroying(() => {
      if (!this.mounted) return;
      
      this.setState({
        destroyingDb: true,
      });
    });
  }

  componentWillUnmount() {
    this.mounted = false;
  }

  handleConnectDb() {
    getDB();
  }

  handleDisconnectDb() {
    destroy();
  }

  render() {
    let dbConnectBtn =
      <button onClick={this.handleConnectDb}>Connect to Db</button>;

    if (this.state.connectingToDb || this.state.destroyingDb) {
      dbConnectBtn =
        <button disabled> Working... </button>;
    } else if (this.state.dbConnected) {
      dbConnectBtn =
        <button onClick={this.handleDisconnectDb}>Disconnect from Db</button>;
    }

    return (
        <div>
            <h1>RxDB Example - React</h1>
            <HeroList/>
            <HeroInsert/>
            {dbConnectBtn}
        </div>
    );    
  }  
}

// const App = () => {
//     return (
//         <div>
//             <h1>RxDB Example - React</h1>
//             <HeroList/>
//             <HeroInsert/>
//         </div>
//     );
// }

// export default App;
