# homebridge-pi-cpu-temperature

A small Homebridge dynamic-platform plugin that exposes the Raspberry Pi CPU temperature as one HomeKit temperature sensor. Version 1.1.0 adds persistent Eve history through `fakegato-history`.

## Features

- Reads the Linux thermal-zone value from `/sys/class/thermal/thermal_zone0/temp`.
- Exposes one standard HomeKit Temperature Sensor.
- Samples locally; no network service, Python helper, or external daemon is needed.
- Adds historical temperature data for the Eve app.
- Keeps the HomeKit accessory UUID compatible with the original `homebridge-pi-temperature` plugin when the sensor name is unchanged.

## Requirements

- Homebridge 1.8 or newer
- Node.js 18 or newer
- Raspberry Pi running Linux with a readable thermal-zone file

## Installation

Install through the Homebridge UI plugin search, or run:

```sh
npm install -g homebridge-pi-cpu-temperature
```

For installations where Homebridge uses a dedicated plugin directory, install the package into that directory. For example:

```sh
/opt/homebridge/bin/npm install --prefix /var/lib/homebridge homebridge-pi-cpu-temperature
```

## Configuration

Add this platform to the Homebridge configuration:

```json
{
  "platform": "PiTemperature",
  "name": "Raspberry Pi CPU Temperature",
  "updateInterval": 30
}
```

Options:

| Option | Default | Description |
| --- | --- | --- |
| `name` | `Raspberry Pi CPU Temperature` | HomeKit sensor name |
| `updateInterval` | `30` | Sampling interval in seconds (minimum 10) |
| `sensorPath` | `/sys/class/thermal/thermal_zone0/temp` | Linux thermal-zone file |
| `historyPath` | Homebridge storage directory | Directory used by Eve history storage |

The sensor file normally reports millidegrees Celsius. The plugin converts this to degrees Celsius before publishing it to HomeKit.

## Eve history

The plugin adds a Fakegato history service to the temperature accessory. Historical data is intended to be viewed in the Eve app. The standard Apple Home app displays the current temperature but does not provide Eve's history view.

History files are stored locally in the Homebridge storage directory by default. Ensure the Homebridge service user can write to that directory.

## Upgrade note

The plugin uses the legacy UUID seed `homebridge-pi-temperature:<sensor name>` so that an existing installation using the earlier `homebridge-pi-temperature` package can retain the same accessory UUID when the name is unchanged. Homebridge accessory-cache migration still needs to be verified on the target installation before removing the old package.

## License

MIT
