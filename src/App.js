import axios from "axios";
import { OpenVidu } from "openvidu-browser";
import React, { Component } from "react";
import "./App.css";
import UserVideoComponent from "./UserVideoComponent";
import socketIOClient from "socket.io-client";
//const ENDPOINT = "https://57f37324288f.ngrok.io";
const ENDPOINT = "http://localhost:5759";
const ENDPOINT1 = "http://localhost:5750";

//const OPENVIDU_SERVER_URL = "http://localhost:4000";
const OPENVIDU_SERVER_URL = " https://cf1468b52395.ngrok.io";

const OPENVIDU_SERVER_SECRET = "MY_SECRET";
let socket;
let userSocket;
let incomingSocket;
let serverToken;
let tokenio;

class App extends Component {
  constructor(props) {
    super(props);

    this.state = {
      mySessionId: "",
      myUserName: "Participant" + Math.floor(Math.random() * 100),
      recordingId: undefined, // recording id after start recording.
      session: undefined,
      mainStreamManager: undefined,
      publisher: undefined,
      friendEmail: "",
      appCode: "",
      sessionId: "",
      socket: undefined,
      subscribers: [],
    };

    this.joinSession = this.joinSession.bind(this);
    this.leaveSession = this.leaveSession.bind(this);
    this.handleChangeSessionId = this.handleChangeSessionId.bind(this);
    this.handleChangeUserName = this.handleChangeUserName.bind(this);
    this.handleMainVideoStream = this.handleMainVideoStream.bind(this);
    this.onbeforeunload = this.onbeforeunload.bind(this);
    this.handleChangeFriendEmail = this.handleChangeFriendEmail.bind(this);
    this.handleChangeAppCode = this.handleChangeAppCode.bind(this);
    this.socketcall = this.socketcall.bind(this);
  }

// shouldComponentUpdate(nextProps,nextState){

// }

  componentDidMount() {
    window.addEventListener("beforeunload", this.onbeforeunload);
    socket = socketIOClient(ENDPOINT);
    userSocket = socketIOClient(ENDPOINT + "/siggunalling");
    incomingSocket = socketIOClient(ENDPOINT + "/incomingSocket");
    serverToken = socketIOClient(ENDPOINT1);
    tokenio = socketIOClient(ENDPOINT1 + "/token");

    const {myUserName,appCode} = this.state;

    console.log(myUserName,appCode);

    userSocket.on(
      `incoming_callcds_iBXPN1a.IaCUv0cUWI7^^^^6fd5303e-7184-469f-bccc-df5f97add91b`,
      (data) => {
        console.log(data);
        userSocket.emit(
          "accept_call",
          {
            caller_id: data.caller_id,
            receiver_id: data.receiver_id,
            psa_app_id: data.psa_app_id,
            call_id: data.id,
            type: data.type,
          },
          (data1) => {
            console.log(data1);
          }
        );
      }
    );

   

    // tokenio.on(`userId${myUserName}`, (data) => {
    //   console.log("in tokenio socket");
    //   console.log(data);
    // });

    tokenio.on(`userIdcds_iBXPN1a.IaCUv0cUWI7`, (data) => {
      console.log("in tokenio socket");
      console.log(data);
    });

    tokenio.on('example',(data)=>{
      console.log('example.........',data);
    });

  }

  componentWillUnmount() {
    window.removeEventListener("beforeunload", this.onbeforeunload);
  }

  onbeforeunload(event) {
    this.leaveSession();
  }

  handleChangeSessionId(e) {
    this.setState({
      mySessionId: e.target.value,
    });
  }

  handleChangeUserName(e) {
    this.setState({
      myUserName: e.target.value,
    });
  }

  handleChangeFriendEmail(e) {
    this.setState({
      friendEmail: e.target.value,
    });
  }

  handleChangeAppCode(e) {
    this.setState({
      appCode: e.target.value,
    });
  }

  handleMainVideoStream(stream) {
    if (this.state.mainStreamManager !== stream) {
      this.setState({
        mainStreamManager: stream,
      });
    }
  }

  deleteSubscriber(streamManager) {
    let subscribers = this.state.subscribers;
    let index = subscribers.indexOf(streamManager, 0);
    if (index > -1) {
      subscribers.splice(index, 1);
      this.setState({
        subscribers: subscribers,
      });
    }
  }

  joinSession() {
    // --- 1) Get an OpenVidu object ---

    this.OV = new OpenVidu();

    // --- 2) Init a session ---

    this.setState(
      {
        session: this.OV.initSession(),
      },
      () => {
        var mySession = this.state.session;

        // --- 3) Specify the actions when events take place in the session ---

        // On every new Stream received...
        mySession.on("streamCreated", (event) => {
          // Subscribe to the Stream to receive it. Second parameter is undefined
          // so OpenVidu doesn't create an HTML video by its own
          var subscriber = mySession.subscribe(event.stream, undefined);
          var subscribers = this.state.subscribers;
          subscribers.push(subscriber);

          // Update the state with the new subscribers
          this.setState({
            subscribers: subscribers,
          });
        });

        // On every Stream destroyed...
        mySession.on("streamDestroyed", (event) => {
          // Remove the stream from 'subscribers' array
          this.deleteSubscriber(event.stream.streamManager);
        });

        // --- 4) Connect to the session with a valid user token ---

        // 'getToken' method is simulating what your server-side should do.
        // 'token' parameter should be retrieved and returned by your own backend
        this.getToken().then((token) => {
          console.log(
            " in then, after getToken--------------------",
            token,
            this.state.sessionId,
            this.state.myUserName,
            this.state.friendEmail,
            this.state.appCode
          );
          // First param is the token got from OpenVidu Server. Second param can be retrieved by every user on event
          // 'streamCreated' (property Stream.connection.data), and will be appended to DOM as the user's nickname
          mySession
            .connect(token, { clientData: this.state.myUserName })
            .then(() => {
              console.log(
                "in then, after connect()--------------------------------------------"
              );
              // --- 5) Get your own camera stream ---

              // Init a publisher passing undefined as targetElement (we don't want OpenVidu to insert a video
              // element: we will manage it on our own) and with the desired properties
              let publisher = this.OV.initPublisher(undefined, {
                audioSource: undefined, // The source of audio. If undefined default microphone
                videoSource: undefined, // The source of video. If undefined default webcam
                publishAudio: true, // Whether you want to start publishing with your audio unmuted or not
                publishVideo: true, // Whether you want to start publishing with your video enabled or not
                resolution: "640x480", // The resolution of your video
                frameRate: 30, // The frame rate of your video
                insertMode: "APPEND", // How the video is inserted in the target element 'video-container'
                mirror: false, // Whether to mirror your local video or not
              });

              // --- 6) Publish your stream ---

              mySession.publish(publisher);

              let hasVideo = false;
              let hasAudio = true;

              //  startRecording(this.state.mySessionId, hasVideo, hasAudio);

              // Set the main video in the page to display our webcam and store our Publisher
              this.setState({
                mainStreamManager: publisher,
                publisher: publisher,
              });
            })
            .catch((error) => {
              console.log(
                "There was an error connecting to the session:",
                error.code,
                error.message
              );
            });
        });
      }
    );
  }

  socketcall() {
    console.log("came here");
    userSocket.emit(
      "initiate_call",
      {
        caller_id: this.state.myUserName,
        receiver_id: this.state.friendEmail,
        psa_app_id: this.state.appCode,
      },
      (resp) => {
        console.log("in socket call", resp);
      }
    );
  }

  leaveSession() {
    // --- 7) Leave the session by calling 'disconnect' method over the Session object ---

    const mySession = this.state.session;

    if (mySession) {
      mySession.disconnect();
    }

    // Empty all properties...
    this.OV = null;
    this.setState({
      session: undefined,
      subscribers: [],
      mySessionId: "SessionA",
      myUserName: "Participant" + Math.floor(Math.random() * 100),
      mainStreamManager: undefined,
      publisher: undefined,
    });
  }

  render() {
    const mySessionId = this.state.mySessionId;
    const myUserName = this.state.myUserName;
    const friendEmail = this.state.friendEmail;
    const appCode = this.state.appCode;

    return (
      <div className="container">
        {this.state.session === undefined ? (
          <div id="join">
            <div id="img-div">
              <img
                src="resources/images/openvidu_grey_bg_transp_cropped.png"
                alt="OpenVidu logo"
              />
            </div>
            <div id="join-dialog" className="jumbotron vertical-center">
              <h1> Join a video session </h1>
              <form className="form-group">
                <p>
                  <label>My E-mail: </label>
                  <input
                    className="form-control"
                    type="text"
                    id="userName"
                    value={myUserName}
                    onChange={this.handleChangeUserName}
                    required
                  />
                </p>
                <p>
                  <label>Friend E-mail: </label>
                  <input
                    className="form-control"
                    type="text"
                    id="friendName"
                    name="friendName"
                    value={friendEmail}
                    onChange={this.handleChangeFriendEmail}
                    required
                  />
                </p>
                <p>
                  <label>App code: </label>
                  <input
                    className="form-control"
                    type="text"
                    id="appCode"
                    name="appCode"
                    value={appCode}
                    onChange={this.handleChangeAppCode}
                    required
                  />
                </p>
                <p>
                  <label> Session: </label>
                  <input
                    className="form-control"
                    type="text"
                    id="sessionId"
                    value={mySessionId}
                    onChange={this.handleChangeSessionId}
                  />
                </p>

                <p className="text-center">
                  <input
                    className="btn btn-lg btn-success"
                    name="commit"
                    type="submit"
                    value="JOIN"
                  />
                </p>
              </form>
              <button onClick={this.socketcall}> Initiate a call</button>
            </div>
          </div>
        ) : null}

        {this.state.session !== undefined ? (
          <div id="session">
            <div id="session-header">
              <h1 id="session-title">{mySessionId}</h1>
              <input
                className="btn btn-large btn-danger"
                type="button"
                id="buttonLeaveSession"
                onClick={this.leaveSession}
                value="Leave session"
              />
            </div>

            {this.state.mainStreamManager !== undefined ? (
              <div id="main-video" className="col-md-6">
                <UserVideoComponent
                  streamManager={this.state.mainStreamManager}
                />
              </div>
            ) : null}
            <div id="video-container" className="col-md-6">
              {this.state.publisher !== undefined ? (
                <div
                  className="stream-container col-md-6 col-xs-6"
                  onClick={() =>
                    this.handleMainVideoStream(this.state.publisher)
                  }
                >
                  <UserVideoComponent streamManager={this.state.publisher} />
                </div>
              ) : null}
              {this.state.subscribers.map((sub, i) => (
                <div
                  key={i}
                  className="stream-container col-md-6 col-xs-6"
                  onClick={() => this.handleMainVideoStream(sub)}
                >
                  <UserVideoComponent streamManager={sub} />
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    );
  }

  /**
   * --------------------------
   * SERVER-SIDE RESPONSIBILITY
   * --------------------------
   * These methods retrieve the mandatory user token from OpenVidu Server.
   * This behavior MUST BE IN YOUR SERVER-SIDE IN PRODUCTION (by using
   * the API REST, openvidu-java-client or openvidu-node-client):
   *   1) Initialize a session in OpenVidu Server	(POST /api/sessions)
   *   2) Generate a token in OpenVidu Server		(POST /api/tokens)
   *   3) The token must be consumed in Session.connect() method
   */

  getToken() {
    console.log(this.state.mySessionId);
    return this.createSession(this.state.mySessionId).then((sessionId) =>
      this.createToken(sessionId)
    );
  }

  createSession(sessionId) {
    console.log("sesionId in create Session------", sessionId);
    return new Promise((resolve, reject) => {
      let data = { customSessionId: sessionId, recordingMode: "ALWAYS" };
      console.log("data in create session", data);
      axios
        .post(OPENVIDU_SERVER_URL + "/sessions/init", data, {
          headers: {
            "Access-Control-Allow-Origin": "*",
          },
        })
        .then((response) => {
          console.log("CREATE SESION", response);
          console.log(response.data.data.id);
          this.setState({
            sessionId: response.data.data.id,
          });
          resolve(response.data.data.id);
        })
        .catch((response) => {
          console.log("in create session", response);
          this.setState({
            sessionId: sessionId,
          });
          resolve(sessionId);

          // else {
          //     console.log(error);
          //     console.warn(
          //         'No connection to OpenVidu Server. This may be a certificate error at ' +
          //         OPENVIDU_SERVER_URL,
          //     );
          //     if (
          //         window.confirm(
          //             'No connection to OpenVidu Server. This may be a certificate error at "' +
          //             OPENVIDU_SERVER_URL +
          //             '"\n\nClick OK to navigate and accept it. ' +
          //             'If no certificate warning is shown, then check that your OpenVidu Server is up and running at "' +
          //             OPENVIDU_SERVER_URL +
          //             '"',
          //         )
          //     ) {
          //         window.location.assign(OPENVIDU_SERVER_URL + '/accept-certificate');
          //     }
          // }
          console.log(response);
        });
    });
  }

  createToken(sessionId) {
    console.log("sessionId in createToken", sessionId);
    return new Promise((resolve, reject) => {
      var data = { sessionId: sessionId, hasAudio: true, hasVideo: false };
      axios
        .post(
          OPENVIDU_SERVER_URL + "/sessions/getToken",
          data
          // , {
          //     headers: {
          //         Authorization: 'Basic ' + btoa('OPENVIDUAPP:' + OPENVIDU_SERVER_SECRET),
          //         'Content-Type': 'application/json',
          //     },
          // }
        )
        .then((response) => {
          console.log("TOKEN", response);
          console.log(response.data.data.token);
          resolve(response.data.data.token);
        })
        .catch((error) => reject(error));
    });
  }
}

const startRecording = async (sessionId, hasVideo, hasAudio) => {
  let data = { sessionId, hasVideo, hasAudio };

  console.log("in start Recording", data);

  try {
    let res = await axios.post(
      OPENVIDU_SERVER_URL + "/sessions/recording/start",
      data
    );

    if (res.status === true) {
      console.log("in start recording if true", res);
      this.state.recordingId = res.data.data.id;
      console.log("recordingId");
    } else {
      console.log("in start recording else", res);
    }
  } catch (e) {
    console.log("ERROR IN START RECORDING", e);
  }
};

const stopRecording = async (recordingId) => {
  let data = { recordingId };

  console.log("in stop Recording", data);

  try {
    let res = await axios.post(
      OPENVIDU_SERVER_URL + "/sessions/recording/stop",
      data
    );

    if (res.status === true) {
      console.log("in stop recording if true", res);
    } else {
      console.log("in stop recording else", res);
    }
  } catch (e) {
    console.log("ERROR IN START RECORDING", e);
  }
};

export default App;
