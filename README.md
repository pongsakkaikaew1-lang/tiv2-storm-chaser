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

## Vehicles

| Vehicle | Top speed | Notes |
|---|---|---|
| TIV2 | 58 mph | Heavy armor |
| Joker 1 | 69 mph | Fastest, lighter armor |
| Joker 2 | 51 mph | Slowest, heaviest armor |
| Radar Truck | 60 mph | The only vehicle that can scan storms; light armor |

Every vehicle locks down with hydraulics that drive spikes or jacks into the ground. In the
garage each vehicle can be painted and upgraded (engine, armor plating, fuel tank, hydraulics).

## Play

- **Android app:** open the repository's **Releases** page on your phone or tablet, download
  `TIV2-Storm-Chaser.apk` from the newest release, open it and allow "Install unknown apps" when
  Android asks. The app plays fully offline.
- **Browser:** open the GitHub Pages link for this repository. After the first visit it also works
  offline, and it can be added to the home screen.

Turn the device sideways for the best view. On older devices pick **Graphics: Low** on the start screen
(no shadows, lighter rendering).

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
| Pause | P / Esc | Pause, or return to base |

Built with [three.js](https://threejs.org/) r128 (`vendor/`) as a single `index.html`, no build step.
Fonts: Fredoka and Nunito (SIL Open Font License, `fonts/`).
