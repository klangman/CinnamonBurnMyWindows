//////////////////////////////////////////////////////////////////////////////////////////
//          )                                                   (                       //
//       ( /(   (  (               )    (       (  (  (         )\ )    (  (            //
//       )\()) ))\ )(   (         (     )\ )    )\))( )\  (    (()/( (  )\))(  (        //
//      ((_)\ /((_|()\  )\ )      )\  '(()/(   ((_)()((_) )\ )  ((_)))\((_)()\ )\       //
//      | |(_|_))( ((_)_(_/(    _((_))  )(_))  _(()((_|_)_(_/(  _| |((_)(()((_|(_)      //
//      | '_ \ || | '_| ' \))  | '  \()| || |  \ V  V / | ' \)) _` / _ \ V  V (_-<      //
//      |_.__/\_,_|_| |_||_|   |_|_|_|  \_, |   \_/\_/|_|_||_|\__,_\___/\_/\_//__/      //
//                                 |__/                                                 //
//////////////////////////////////////////////////////////////////////////////////////////

// SPDX-License-Identifier: GPL-3.0-or-later

'use strict';

// We import some modules only in the Shell process as they are not available in the
// preferences process. They are used only in the creator function of the ShaderFactory
// which is only called within GNOME Shell's process.
const {ShaderFactory} = require('./ShaderFactory.js');
const {LayeredEffect} = require('./LayeredEffect.js');
const Clutter = imports.gi.Clutter;

const Gettext = imports.gettext;
const GLib = imports.gi.GLib;
const UUID = "CinnamonBurnMyWindows@klangman";

Gettext.bindtextdomain(UUID, GLib.get_user_data_dir() + "/locale");

function _(text) {
  let locText = Gettext.dgettext(UUID, text);
  if (locText == text) {
    locText = window._(text);
  }
  return locText;
}

// Tunables (candidates for user settings). More live at the top of
// resources/shaders/aperture-panels.frag. The panel size is a setting (aperture-panels-panel-size).
// Values of the aperture-panels-wave-shape and aperture-panels-flip-axis settings (see
// settings-schema.json; wave shapes 0-4 are described in aperture-panels.frag).
const WAVE_SHAPE_RANDOM  = 5;
const FLIP_AXIS_VERTICAL = 0;
const FLIP_AXIS_RANDOM   = 2;
const BACKDROP_BLACK_VOID  = 1;  // aperture-panels-backdrop: 0 = Wallpaper, 1 = Black void,
const BACKDROP_TRANSPARENT = 2;  //                           2 = Transparent

//////////////////////////////////////////////////////////////////////////////////////////
// The window is split into a grid of panels (like the moving wall panels in the Portal //
// games) which flip over one after another, revealing the window on their back when it //
// opens and what was behind it when it closes.                                         //
//                                                                                      //
// Uses the standard layers of LayeredEffect.js, with a wall:                           //
//   wall    = the desktop: wallpaper, icons, desklets (no shader); black with the      //
//             "Black void" backdrop (the shader also paints the gaps black then)       //
//   surface = the panels' front: the windows behind (uLayer = 0), and the desktop     //
//             with the "Black void" backdrop                                           //
//   window  = the panels' back: a clone of the window itself (uLayer = 1)              //
//   above   = clones of the windows above the window (no shader)                       //
// See resources/shaders/aperture-panels.frag.                                          //
//////////////////////////////////////////////////////////////////////////////////////////

// The effect class can be used to get some metadata (like the effect's name or supported
// GNOME Shell versions), to initialize the respective page of the settings dialog, as
// well as to create the actual shader for the effect.
var Effect = class Effect {

  // The constructor creates a ShaderFactory which will be used by extension.js to create
  // shader instances for this effect. The shaders will be automagically created using the
  // GLSL file in resources/shaders/<nick>.frag. The callback will be called for each
  // newly created shader instance.
  constructor() {
    this.shaderFactory = new ShaderFactory(Effect.getNick(), (shader) => {
      // Store uniform locations of newly created shaders.
      shader._uFrame     = shader.get_uniform_location('uFrame');
      shader._uCell      = shader.get_uniform_location('uCell');

      shader._uWaveShape    = shader.get_uniform_location('uWaveShape');
      shader._uVerticalAxis = shader.get_uniform_location('uVerticalAxis');
      shader._uBorderStyle  = shader.get_uniform_location('uBorderStyle');
      shader._uBorderColor  = shader.get_uniform_location('uBorderColor');
      shader._uBlackVoid    = shader.get_uniform_location('uBlackVoid');
    });
  }

  // -------------------------------------------------------------- API for extension.js

  // Called by extension.js instead of its usual set-up; see LayeredEffect.js.
  createLayers(actor, shader, ctx) {
    const settings = ctx.settings;

    // Target panel size in pixels; adjusted so the grid fits the window exactly.
    const panelSize = Math.max(1, settings.getValue('aperture-panels-panel-size'));

    // Backdrop: what shows behind the panels as they turn. "Wallpaper": the desktop stays on
    // the wall and only the windows behind are painted on the panels. "Black void": the
    // desktop (wallpaper, desktop icons, desklets) is painted on the panels too, so it flips
    // with them and the wall is black.
    // "Transparent": no wall and no desktop at all; the real screen shows through the gaps.
    const backdrop    = settings.getValue('aperture-panels-backdrop');
    const blackVoid   = backdrop === BACKDROP_BLACK_VOID;
    const transparent = backdrop === BACKDROP_TRANSPARENT;

    // The user's settings, read once: both shaders must get the same values, including the
    // same pick for the "Random" options.
    let waveShape = settings.getValue('aperture-panels-wave-shape');
    if (waveShape === WAVE_SHAPE_RANDOM) {
      waveShape = Math.floor(Math.random() * WAVE_SHAPE_RANDOM);
    }
    let flipAxis = settings.getValue('aperture-panels-flip-axis');
    if (flipAxis === FLIP_AXIS_RANDOM) {
      flipAxis = Math.floor(Math.random() * FLIP_AXIS_RANDOM);
    }
    const borderStyle = settings.getValue('aperture-panels-border-style');
    const bc = Clutter.Color.from_string(settings.getValue('aperture-panels-border-color'))[1];

    return LayeredEffect.create(actor, shader, ctx, {
      factory:       this.shaderFactory,
      wall:          !transparent,  // shows through the gaps between the turning panels
      desktopOnWall: !blackVoid && !transparent,
      noDesktop:     transparent,

      // A grid over the visible window only, with a panel size that divides it exactly.
      geometry: (frame) => {
        const cols = Math.max(1, Math.round(frame.width  / panelSize));
        const rows = Math.max(1, Math.round(frame.height / panelSize));
        return {cellW: frame.width / cols, cellH: frame.height / rows};
      },

      init: (s) => {
        s.set_uniform_float(s._uWaveShape,    1, [waveShape]);
        s.set_uniform_float(s._uVerticalAxis, 1, [flipAxis === FLIP_AXIS_VERTICAL ? 1 : 0]);
        s.set_uniform_float(s._uBorderStyle,  1, [borderStyle]);
        s.set_uniform_float(s._uBorderColor,  4, [bc.red / 255, bc.green / 255, bc.blue / 255, bc.alpha / 255]);
        // The shader paints the gaps between the panels black itself (a black wall actor
        // isn't drawn on GNOME / Mutter; the two versions share the shader).
        s.set_uniform_float(s._uBlackVoid,    1, [blackVoid ? 1 : 0]);
      },

      onGeometry: (s, g) => {
        s.set_uniform_float(s._uFrame, 4, [g.frame.x, g.frame.y, g.frame.width, g.frame.height]);
        s.set_uniform_float(s._uCell,  2, [g.cellW, g.cellH]);
      }
    });
  }

  // ---------------------------------------------------------------------------- metadata

  // The effect is available on all GNOME Shell versions supported by this extension.
  static getMinShellVersion() {
    return [3, 36];
  }

  // This will be called in various places where a unique identifier for this effect is
  // required. It should match the prefix of the settings keys which store whether the
  // effect is enabled currently (e.g. '*-close-effect'), and its animation time
  // (e.g. '*-animation-time').
  static getNick() {
    return 'aperture-panels';
  }

  // This will be shown in the sidebar of the preferences dialog as well as in the
  // drop-down menus where the user can choose the effect.
  static getLabel() {
    return _('Aperture Panels');
  }

  // -------------------------------------------------------------------- API for prefs.js

  // This is called by the preferences dialog whenever a new effect profile is loaded. It
  // binds all user interface elements to the respective settings keys of the profile.
  static bindPreferences(dialog) {
    dialog.bindAdjustment('aperture-panels-animation-time');
    dialog.bindAdjustment('aperture-panels-panel-size');
    dialog.bindColorButton('aperture-panels-border-color');
  }

  // ---------------------------------------------------------------- API for extension.js

  // The window is never scaled: the layers (see LayeredEffect.js) cover everything needed.
  static getActorScale(settings, forOpening, actor) {
    return {x: 1.0, y: 1.0};
  }

  // The getSFX() is called from extension.js to get the sound effect file for this effect
  static getSFX(settings, forOpening) {
     if (forOpening) {
        return settings.getValue("aperture-panels-open-sound");
     } else {
        return settings.getValue("aperture-panels-close-sound");
     }
  }
}
