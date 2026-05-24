from .blocked_insecam import BlockedInsecamProvider
from .broadcastify import BroadcastifyProvider
from .earthcam import EarthCamProvider
from .fl511 import FL511Provider
from .flfirefighters import FloridaFirefightersProvider
from .marinecadastre_ais import MarineCadastreAisProvider
from .openwebcamdb import OpenWebcamDbProvider
from .outdooractive import OutdooractiveProvider
from .skyline import SkylineProvider

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
]
