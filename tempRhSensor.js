(function() {
    'use strict';
// Service UUID found based on chrome://bluetooth-internals/#devices
// Name:LYWSD03MMC  Address:A4:C1:38:7C:1C:13
const service_UUID_1 = '00000100-0065-6c62-2e74-6f696d2e696d';//
const service_UUID_2 = '8edffff0-3d1b-9c37-4623-ad7265f14076';//maybe sensor data
const service_UUID_3 = 'ebe0ccb0-7a0a-4b0c-8a1a-6ff2997da3a6';//
const service_UUID_4 = '00010203-0405-0607-0809-0a0b0c0d1912';//
const service_UUID_5 = '0000180f-0000-1000-8000-00805f9b34fb';//Battery service
const service_UUID_6 = '0000180a-0000-1000-8000-00805f9b34fb';//maybe ifo
const service_UUID_7 = '00001801-0000-1000-8000-00805f9b34fb';//maybe attribute
const service_UUID_8 = '0000fe95-0000-1000-8000-00805f9b34fb'; //
const service_UUID_9 = '00001800-0000-1000-8000-00805f9b34fb'; //maybe access

//Chraracteristic UUID found based on chrome://bluetooth-internals/#devices/ee:a8:9d:84:a5:41 
const characteristic_UUID_1 = '8edfffef-3d1b-9c37-4623-ad7265f14076';//maybe Temp and RH
const characteristic_UUID_2 = 'ebe0ccc1-7a0a-4b0c-8a1a-6ff2997da3a6';

//Descriptor UUID found based on chrome://bluetooth-internals/#devices/ee:a8:9d:84:a5:41 

    class TempRhSensor {
        constructor() {
            this.device = null;
            this.server = null;
            this._characteristics = new Map();
        }
        connect() {
                return navigator.bluetooth.requestDevice({ 
                    filters: [{
                        namePrefix: 'LYWS'}],
                      optionalServices: [service_UUID_2, service_UUID_3] 
                })
                .then(device => {
                    // event.serviceData.forEach((valueDataView, key) => {
                    //     console.log(`Temperature is ${valueDataView.getUint8()}`);  
                    //  });
                     this.device = device;
                     return device.gatt.connect();
                })
                .then(server => {
                    this.server = server;
                    return server.getPrimaryService(service_UUID_3);
                })
                .then(service => {
                    return this._cacheCharacteristic(service,                     characteristic_UUID_2);
                    // return service.getCharacteristic(characteristic_UUID_1);
                })
                .then(value => {
                   console.log(`Temp is ${value}`);            
                })
        }

        /* Temp Service */

        startNotificationsTempRhMeasurement() {
            return this._startNotifications(characteristic_UUID_2);
        }
        stopNotificationsTempRhMeasurement() {
            return this._stopNotifications(characteristic_UUID_2);
        }
        parseTempRh(value) {
            // In Chrome 50+, a DataView is returned instead of an ArrayBuffer.
            value = value.buffer ? value : new DataView(value);
            let flags = value.getUint8(0);
            let rate16Bits = flags & 0x1;
            let result = {};
            let index = 0;
            // if (rate16Bits) {
                result.tempRh = value.getUint16(index, true) / 100
                // value.getUint16(index, /*littleEndian=*/ true)/20;
                index += 2;
            // } else {
            //     result.tempRh = value.getUint8(index)/10;
            //     index += 1;
            // }
            let contactDetected = flags & 0x2;
            let contactSensorPresent = flags & 0x4;
            if (contactSensorPresent) {
                result.contactDetected = !!contactDetected;
            }
            let energyPresent = flags & 0x8;
            if (energyPresent) {
                result.energyExpended = value.getUint16(index, /*littleEndian=*/ true);
                index += 2;
            }
            let rrIntervalPresent = flags & 0x10;
            if (rrIntervalPresent) {
                let rrIntervals = [];
                for (; index + 1 < value.byteLength; index += 2) {
                    rrIntervals.push(value.getUint16(index, /*littleEndian=*/ true));
                }
                result.rrIntervals = rrIntervals;
            }
            // let result = value.getFloat32();
            return result;
        }

        /* Utils */

        _cacheCharacteristic(service, characteristicUuid) {
            return service.getCharacteristic(characteristicUuid)
                .then(characteristic => {
                    this._characteristics.set(characteristicUuid, characteristic);
                });
        }
        _readCharacteristicValue(characteristicUuid) {
            let characteristic = this._characteristics.get(characteristicUuid);
            return characteristic.readValue()
                .then(value => {
                    // In Chrome 50+, a DataView is returned instead of an ArrayBuffer.
                    value = value.buffer ? value : new DataView(value);
                    return value;
                });
        }
        _writeCharacteristicValue(characteristicUuid, value) {
            let characteristic = this._characteristics.get(characteristicUuid);
            return characteristic.writeValue(value);
        }
        _startNotifications(characteristicUuid) {
            let characteristic = this._characteristics.get(characteristicUuid);
            // Returns characteristic to set up characteristicvaluechanged event
            // handlers in the resolved promise.
            return characteristic.startNotifications()
                .then(() => characteristic);
        }
        _stopNotifications(characteristicUuid) {
            let characteristic = this._characteristics.get(characteristicUuid);
            // Returns characteristic to remove characteristicvaluechanged event
            // handlers in the resolved promise.
            return characteristic.stopNotifications()
                .then(() => characteristic);
        }
    }

    window.tempRhSensor = new TempRhSensor();

})();