/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 */
'use strict';

var React = require('react-native');
var TimerMixin = require('react-timer-mixin');
var {
  AppRegistry,
  View,
  Animated,
  StatusBarIOS,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Text,
  NavigatorIOS,
  SliderIOS,
} = React;

var styles    = require('./style');
var screen    = require('Dimensions').get('window');
var Recorder  = require('react-native-screcorder');
var Video     = require('react-native-video');

/*********** RECORDER COMPONENT ***********/

var Record = React.createClass({
  mixins: [TimerMixin],

  getInitialState: function() {
    return {
      device: 'back',
      realtimePreview: false,
      recording: false,
      nbSegments: 0,
      barPosition: new Animated.Value(0),
      currentDuration: 0,
      maxDuration: 3000,
      limitReached: false,
      config: {
        flashMode: Recorder.constants.SCFlashModeOff,
        video: {
          enabled: true,
          bitrate: 1200000,
          timescale: 1,
          format: 'MPEG4',
          quality: 'MediumQuality', // HighestQuality || MediumQuality || LowQuality
          filters: [],
        },
      },
    };
  },

  componentDidMount: function() {
    StatusBarIOS.setHidden(true, 'slide');
    setTimeout(() => {
      this.refs.recorder.startRunning(() => {
        console.log('start running');
      });
    }, 100);
  },

  componentWillUnmount: function() {
    console.log('stop running');
    this.refs.recorder.stopRunning();
  },

  /*
   *  PRIVATE METHODS
   */

  startBarAnimation: function() {
    this.animRunning = true;
    this.animBar = Animated.timing(
      this.state.barPosition,
      {
        toValue: screen.width,
        duration: this.state.maxDuration - this.state.currentDuration,
      }
    );
    this.animBar.start(() => {
      // The video duration limit has been reached
      if (this.animRunning) {
        this.finish();
      }
    });
  },

  resetBarAnimation: function() {
    Animated.spring(this.state.barPosition, {toValue: 0}).start();
  },

  stopBarAnimation: function() {
    this.animRunning = false;
    if (this.animBar)
      this.animBar.stop();
  },

  /*
   *  PUBLIC METHODS
   */

  record: function() {
    if (this.state.limitReached) return;
    this.refs.recorder.record();
    this.startBarAnimation();
    this.setState({recording: true});
  },

  pause: function(limitReached) {
    if (!this.state.recording) return;
    this.refs.recorder.pause();
    this.stopBarAnimation();
    this.setState({recording: false, nbSegments: ++this.state.nbSegments});
  },

  finish: function() {
    this.stopBarAnimation();
    this.refs.recorder.pause();
    this.setState({recording: false, limitReached: true, nbSegments: ++this.state.nbSegments});
  },

  reset: function() {
    this.resetBarAnimation();
    this.refs.recorder.removeAllSegments();
    this.setState({
      recording: false,
      nbSegments: 0,
      currentDuration: 0,
      limitReached: false,
    });
  },

  preview: function() {
    this.refs.recorder.save((err, url) => {
      console.log('url = ', url);
      this.refs.recorder.stopRunning();
      this.props.navigator.push({
        component: Preview,
        passProps: {
          video: url,
          onPop: () => {
            this.refs.recorder.startRunning();
          },
        },
      });
    });
  },

  setDevice: function() {
    var device = (this.state.device == 'front') ? 'back' : 'front';
    this.setState({device: device});
  },

  /*
   *  EVENTS
   */

  onRecordDone: function() {
    this.setState({nbSegments: 0});
  },

  onNewSegment: function(segment) {
    console.log('segment = ', segment);
    this.state.currentDuration += segment.duration * 1000;
  },

  switchRealtimePreview: function() {
    let newConfig = JSON.parse(JSON.stringify(this.state.config));
    if (this.state.realtimePreview) {
      newConfig.video.filters = [];
    } else {
      newConfig.video.filters = [
        {CIfilter: 'CIExposureAdjust', inputEV: 1.0},
      ];
    }

    this.setState({
      config: newConfig,
      realtimePreview: !this.state.realtimePreview,
    });
  },

  changeValue: function(val) {
    console.log('value: ' + val);
    let newConfig = JSON.parse(JSON.stringify(this.state.config));
    if (newConfig.video.filters.length > 0) {
      newConfig.video.filters[0].inputEV = val;
    }

    this.setState({config: newConfig});
  },

  /*
   *  RENDER METHODS
   */

  renderBar: function() {
    return (
      <View style={styles.barWrapper}>
        <Animated.View style={[styles.barGauge, {width: this.state.barPosition}]}/>
      </View>
    );
  },

  render: function() {
    var bar     = this.renderBar();
    var control = null;

    if (!this.state.limitReached) {
      control = (
        <TouchableOpacity onPressIn={this.record} onPressOut={this.pause} style={styles.controlBtn}>
          <Text>Record</Text>
        </TouchableOpacity>
      );
    }

    let realtimePreviewControlText = this.state.realtimePreview ? 'Realtime' : 'Normal';
    return (
      <Recorder
        ref='recorder'
        config={this.state.config}
        device={this.state.device}
        realtimePreview={this.state.realtimePreview}
        onNewSegment={this.onNewSegment}
        style={styles.wrapper}>
        {bar}
        <View style={styles.infoBtn}>
          <Text style={styles.infoBtnText}>{this.state.nbSegments}</Text>
        </View>
        <View style={[styles.sliderControls, {opacity:1.0}]}>
          <SliderIOS style={styles.slider}
            minimumValue={0}
            maximumValue={10}
            value={0.5}
            onValueChange={this.changeValue}/>
        </View>
        <View style={styles.controls}>
          {control}
          <TouchableOpacity onPressIn={this.reset} style={styles.controlBtn}>
            <Text>Reset</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={this.preview} style={styles.controlBtn}>
            <Text>Preview</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={this.switchRealtimePreview} style={styles.controlBtn}>
            <Text>{realtimePreviewControlText}</Text>
          </TouchableOpacity>
        </View>
      </Recorder>
    );
  },

});

/*********** PREVIEW COMPONENT ***********/

var Preview = React.createClass({

  getInitialState: function() {
    return {
      paused: false,
    };
  },

  goBack: function() {
    this.setState({paused: true});
    this.props.navigator.pop();
    this.props.onPop();
  },

  render: function() {
    return (
      <TouchableWithoutFeedback onPress={this.goBack}>
        <Video
          source={{uri: this.props.video}}
          style={styles.wrapper}
          muted={false}
          resizeMode='cover'
          paused={this.state.paused}
          repeat={true}/>
      </TouchableWithoutFeedback>
    );
  },

});

/*********** APP COMPONENT ***********/

var App = React.createClass({
  render: function() {
    return (
      <NavigatorIOS initialRoute={{component: Record}} style={{flex: 1}} navigationBarHidden={true}/>
    );
  },
});

AppRegistry.registerComponent('Example', () => App);
