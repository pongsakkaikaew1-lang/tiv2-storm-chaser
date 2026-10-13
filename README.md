# TIV2 Storm Chaser

A 3D storm chasing game that runs in any modern browser, made for tablets.

## How a chase works

1. **Base:** read the forecast map (orange risk area and the storm's expected direction),
   pick a spawn point, choose your vehicle, refuel, repair and buy gear.
2. **Radar:** after you deploy, the radar shows the risk area, then the supercell with a dashed
   line for its expected track. Get ahead of it before the tornado touches down.
3. **Collect data:** park, press Hydraulics to lock down, then film with the camera, drop probes
   in its path, scan with the Radar Truck, or let the tornado pass right over you.
4. **Get paid:** data is paid at $0.50 per point when the tornado ropes out (or when you return
   to base early). Spend it on fuel, repairs, probes, upgrades and paint, then chase the next storm.

Fuel burns while you drive, damage stays until you repair it, and if your armor runs out the crew
tows you out for a $250 fee. Progress is saved in the browser.

## Admin

In the base, **Shop → Admin** opens a PIN-locked panel (you create the PIN the first time). It can add
any amount of money, set the money to an exact amount, or switch on **Unlimited money** so everything
in the shop and garage is free. The PIN is stored on the device, so it only keeps casual players out.

## Tornado types

Every tornado gets a type that fits its EF rating, after the Twisted wiki: rope, funnel, floating,
cone, sidewinder, stovepipe, drillbit, multi-vortex, wedge and barrel. Each has its own funnel shape
and wind field: sidewinders swing side to side, floating funnels dangle until they touch down,
multi-vortex and barrel tornadoes have orbiting suction vortices with extra-strong gusts, drillbits
have a tiny wind field, and wedges are huge. Cones and sidewinders earn more data on camera, wedges
pay the most for probes. Stovepipes can grow into cones or wedges, drillbits often start as
multi-vortex, and every tornado ropes out before it dies.

## Radar

The small radar and the full radar map (**M** or tap the radar) follow the Twisted wiki: base
reflectivity (dBZ) and base velocity (red away from the radar, green toward it) on a blocky grid
with the hook echo, the weak-echo "eye" and a debris ball for strong tornadoes; rotation, TVS
(colored by estimated winds: green, yellow, orange, red, pink) and hail icons; lightning; and severe
thunderstorm, tornado and PDS warning polygons. The KHZL Doppler station updates every 4 s; the
Radar Truck's mobile radar (while scanning) updates every second with more accurate wind estimates
but only reaches about 1 km. A violent tornado near KHZL knocks it offline until the next storm.
The map's tornado panel shows type, estimated EF, winds, path length, max width and buildings hit.

## Vehicles

| Vehicle | Top speed | Holds when locked | Notes |
|---|---|---|---|
| TIV2 | 58 mph | 235 mph | Strongest when deployed, slow to deploy (Twisted wiki) |
| Joker 1 | 69 mph | 185 mph | Fastest, deploys quickly, lighter armor |
| Joker 2 | 51 mph | 210 mph | Slowest, heaviest armor |
| Radar Truck | 60 mph | 140 mph | The only vehicle that can scan storms; light armor |

If the wind goes past what a locked-down vehicle holds, it is torn loose and damaged. Armor plating
upgrades add 10 mph per level.

Every vehicle locks down with hydraulics that drive spikes or jacks into the ground. In the
garage each vehicle can be painted and upgraded (engine, armor plating, fuel tank, hydraulics).

## Play

- **Android app:** open the repository's **Releases** page on your phone or tablet, download
  `TIV2-Storm-Chaser.apk` from the newest release, open it and allow "Install unknown apps" when
  Android asks. The app plays fully offline.
- **Browser:** open the GitHub Pages link for this repository. After the first visit it also works
  offline, and it can be added to the home screen.

Turn the device sideways for the best view.

## Look and graphics quality

Chases happen at sunset: a deep purple sky with an orange glow in the west, long shadows, dusky fog
and rain. The supercell is a stack of blocky cloud tiers turning over the storm, with lightning
flickering inside and bolts that light up the scene; tornadoes are smoky with debris tumbling around
them. The road is wet and glossy, grass sways in the wind, power lines run along the roads, and the
vehicles have headlight beams, blinking amber warning lights and a roof beacon. The HUD has a weather
radar window and a SPEED / WIND / DISTANCE readout.

Pick **Graphics** on the start screen or in the pause menu: **High** (shadows, dense grass, every
effect), **Medium** (no shadows, less grass and debris) or **Low** (older devices: no grass, headlight
beams or lightning light). If the game runs below about 24 fps during a chase it steps down a level
on its own.

## Android build

Every push runs `.github/workflows/android.yml`: it wraps the game in a Capacitor WebView app
(landscape, full screen, screen kept on, files bundled inside the APK), builds a debug-signed APK and
attaches it to a new release. `android-app/` holds the app's launcher icons, splash and main activity.

## Controls

| Touch | Keyboard | Action |
|---|---|---|
| Left joystick | Arrows / WASD | Drive |
| Hydraulics | R | Lock the vehicle to the ground (stop first) |
| Camera | H | Film the tornado for data |
| Probe | G | Drop a probe in the tornado's path |
| Scan | F | Radar scan (Radar Truck, locked down) |
| View | C | Change camera view |
| Radar | M | Open the radar map |
| Pause | P / Esc | Pause, or return to base |

Built with [three.js](https://threejs.org/) r128 (`vendor/`) as a single `index.html`, no build step.
Fonts: Fredoka and Nunito (SIL Open Font License, `fonts/`).
