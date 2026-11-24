'use strict';

const PLUGIN_NAME = 'homebridge-pi-cpu-temperature';
const PLATFORM_NAME = 'PiTemperature';
const DEFAULT_NAME = 'Raspberry Pi CPU Temperature';
const DEFAULT_SENSOR_PATH = '/sys/class/thermal/thermal_zone0/temp';

module.exports = (api) => {
  api.registerPlatform(PLUGIN_NAME, PLATFORM_NAME, PiTemperaturePlatform);
};

class PiTemperaturePlatform {
  constructor(log, config, api) {
    this.log = log;
    this.config = config || {};
    this.api = api;
    this.accessories = [];
    this.timer = null;
    this.historyService = null;
    this.currentTemperature = null;
    this.sensorPath = this.config.sensorPath || DEFAULT_SENSOR_PATH;
    this.updateInterval = Math.max(10, Number(this.config.updateInterval) || 30) * 1000;
    this.name = this.config.name || DEFAULT_NAME;
    this.historyPath = this.config.historyPath || api.user.storagePath();

    api.on('didFinishLaunching', () => {
      this.start().catch((error) => this.log.error('Could not start CPU temperature sensor:', error));
    });
  }

  configureAccessory(accessory) {
    this.accessories.push(accessory);
  }

  async start() {
    const { Service, Characteristic, HapStatusError, HAPStatus } = this.api.hap;
    const uuid = this.api.hap.uuid.generate('homebridge-pi-temperature:' + this.name);
    let accessory = this.accessories.find((item) => item.UUID === uuid);

    if (!accessory) {
      accessory = new this.api.platformAccessory(this.name, uuid);
      this.api.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory]);
      this.accessories.push(accessory);
    }

    accessory.category = this.api.hap.Categories.SENSOR;
    accessory.context.device = accessory.context.device || { name: this.name };

    let temperatureService = accessory.getService(Service.TemperatureSensor);
    if (!temperatureService) {
      temperatureService = accessory.addService(Service.TemperatureSensor, this.name);
    }
    temperatureService.setCharacteristic(Characteristic.Name, this.name);
    temperatureService.setCharacteristic(Characteristic.StatusActive, true);
    temperatureService.setCharacteristic(Characteristic.StatusFault, Characteristic.StatusFault.NO_FAULT);
    temperatureService.setCharacteristic(Characteristic.StatusTampered, Characteristic.StatusTampered.NOT_TAMPERED);

    temperatureService.getCharacteristic(Characteristic.CurrentTemperature)
      .onGet(() => {
        if (this.currentTemperature === null) {
          throw new HapStatusError(HAPStatus.SERVICE_COMMUNICATION_FAILURE);
        }
        return this.currentTemperature;
      });

    const FakeGatoHistoryService = require('fakegato-history')(this.api);
    this.historyService = new FakeGatoHistoryService('weather', accessory, {
      log: this.log,
      storage: 'fs',
      path: this.historyPath
    });
    accessory.log = this.log;

    this.log.info('CPU temperature sensor started; sampling every %d seconds.', this.updateInterval / 1000);
    this.log.info('Eve history storage: %s', this.historyPath);

    await this.updateTemperature();
    this.timer = setInterval(() => {
      this.updateTemperature().catch((error) => this.log.warn('Temperature update failed:', error));
    }, this.updateInterval);
  }

  async updateTemperature() {
    const fs = require('fs/promises');
    const raw = await fs.readFile(this.sensorPath, 'utf8');
    const milliDegrees = Number.parseInt(raw.trim(), 10);

    if (!Number.isFinite(milliDegrees) || milliDegrees <= 0) {
      throw new Error('Invalid CPU temperature value read from ' + this.sensorPath);
    }

    const temperature = Math.round((milliDegrees / 1000) * 10) / 10;
    if (temperature < -40 || temperature > 150) {
      throw new Error('CPU temperature outside plausible range: ' + temperature + ' °C');
    }

    this.currentTemperature = temperature;
    if (this.historyService) {
      this.historyService.addEntry({
        time: Math.round(Date.now() / 1000),
        temp: temperature
      });
    }
    this.log.debug('CPU temperature: %s °C', temperature);
  }
}
