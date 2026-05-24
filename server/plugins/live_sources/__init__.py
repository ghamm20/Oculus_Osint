from .aircraft_adsb import AircraftAdsbProvider
from .blocked_insecam import BlockedInsecamProvider
from .blocked_sources import BlockedPrivateCameraIndexesProvider
from .broadcastify import BroadcastifyProvider
from .earthcam import EarthCamProvider
from .earthquakes import EarthquakesProvider
from .fl511 import FL511Provider
from .flfirefighters import FloridaFirefightersProvider
from .generic_stream import GenericStreamProvider
from .marine_ais import MarineAisProvider
from .marinecadastre_ais import MarineCadastreAisProvider
from .openwebcamdb import OpenWebcamDbProvider
from .outdooractive import OutdooractiveProvider
from .public_webcams import PublicWebcamsProvider
from .scanner_audio import ScannerAudioProvider
from .skyline import SkylineProvider
from .traffic_cameras import TrafficCamerasProvider
from .weather_cameras import WeatherCamerasProvider
from .weather_radar import WeatherRadarProvider
from .wifi_presence_placeholder import WifiPresencePlaceholderProvider
from .wildfire_feeds import WildfireFeedsProvider

PROVIDERS = [
    EarthCamProvider(),
    FL511Provider(),
    OutdooractiveProvider(),
    OpenWebcamDbProvider(),
    SkylineProvider(),
    FloridaFirefightersProvider(),
    BroadcastifyProvider(),
    MarineCadastreAisProvider(),
    BlockedInsecamProvider(),
    PublicWebcamsProvider(),
    TrafficCamerasProvider(),
    WeatherCamerasProvider(),
    WildfireFeedsProvider(),
    ScannerAudioProvider(),
    MarineAisProvider(),
    AircraftAdsbProvider(),
    EarthquakesProvider(),
    GenericStreamProvider(),
    WeatherRadarProvider(),
    WifiPresencePlaceholderProvider(),
    BlockedPrivateCameraIndexesProvider(),
]
