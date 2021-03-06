'use strict';

const child_process = require('child_process');
const path = require('path');
let Service, Characteristic;

module.exports = (homebridge) => {
  Service = homebridge.hap.Service;
  Characteristic = homebridge.hap.Characteristic;

  homebridge.registerAccessory('homebridge-gpio-fan', 'PWMFan', FanPlugin);
};

class FanPlugin
{
  constructor(log, config) {
    this.log = log;
    this.name = config.name;

    this.tach_bcm = parseInt(config.tach_bcm) || 16;   // physical #36, BCM 16
    this.motor_bcm = parseInt(config.motor_bcm) || 23; // physical #16, BCM 23

    this.frequency = parseInt(config.frequency) || 1;  // Hz
    this.def_dutycycle = config.def_dutycycle !== undefined ? parseInt(config.def_dutycycle) : 255; // 0-255 = 0%-100%
    this.min_dutycycle = config.min_dutycycle !== undefined ? parseInt(config.min_dutycycle) : 0;
    this.dutycycle = this.def_dutycycle;

    this.helper = null;
    this.helperPath = path.join(__dirname, 'pwmfanhelper.py');
    this._relaunchHelper();

    this.fan = new Service.Fan(this.name);
    this.fan
      .getCharacteristic(Characteristic.On)
      .on('get', this.getOn.bind(this))
      .on('set', this.setOn.bind(this));
    this.fan
      .getCharacteristic(Characteristic.RotationSpeed)
      .on('get', this.getRotationSpeed.bind(this))
      .on('set', this.setRotationSpeed.bind(this));
  }

  // Relaunch the Python helper process, possibly with new arguments
  _relaunchHelper() {
    if (this.helper) {
      this.helper.kill();
      // TODO: more cleanup needed?
    }
 
    this.helper = child_process.spawn('python', ['-u', this.helperPath, this.tach_bcm, this.motor_bcm, this.frequency, this.dutycycle])

    this.helper.stderr.on('data', (err) => {
      throw new Error(`pwmfanhelper error: ${err}`);
    });

    this.helper.stdout.on('data', (data) => {
      this.rpm = parseInt(data);
      //console.log(`rpm: ${this.rpm}`);
    });
  }

  getOn(cb) {
    const on = this.rpm > 0;
    cb(null, on);
  }

  setOn(on, cb) {
    if (on) {
      this.dutycycle = this.def_dutycycle;
    } else {
      this.dutycycle = 0; // 0% duty cycle to turn off
    }
    this._relaunchHelper();
    cb(null, on);
  }

  getRotationSpeed(cb) {
    cb(null, this.rpm);
  }

  setRotationSpeed(speed, cb) {
    // speed given is a number 100 (full power) to 0
    //console.log('setRotationSpeed',speed);
    // scale speed by duty cycle
    this.dutycycle = 0|(speed / 100 * 255);
    if (this.dutycycle < this.min_dutycycle) this.dutycycle = this.min_dutycycle; 
    const OnOff = new Gpio( '4', 'out' );
    if (speed = 0) {
        let OnOff = true;
     } else {
	      let OnOff = false;
      }
    
    
    
    // clamp to minimum TODO: return error to user if can't go this low?
    //console.log('dutycycle',this.dutycycle);
    this._relaunchHelper();

    cb(null);
  }

  getServices() {
    return [this.fan];
  }
}
