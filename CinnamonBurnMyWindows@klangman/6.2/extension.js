// Cinnamon port by Kevin Langman 2024

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

// SPDX-FileCopyrightText: Simon Schneegans <code@simonschneegans.de>
// SPDX-License-Identifier: GPL-3.0-or-later

'use strict';

const Apparition = require('./effects/Apparition');
const BrokenGlass = require('./effects/BrokenGlass');
const Doom = require('./effects/Doom.js');
const EnergizeA = require('./effects/EnergizeA.js');
const EnergizeB = require('./effects/EnergizeB.js');
const Fire = require('./effects/Fire.js');
const Glide = require('./effects/Glide.js');
const Glitch = require('./effects/Glitch.js');
const Hexagon = require('./effects/Hexagon.js');
const Incinerate = require('./effects/Incinerate.js');
const Matrix = require('./effects/Matrix.js');
const PaintBrush = require('./effects/PaintBrush.js');
const Pixelate = require('./effects/Pixelate.js');
const PixelWheel = require('./effects/PixelWheel.js');
const PixelWipe = require('./effects/PixelWipe.js');
const Portal = require('./effects/Portal.js');
const SnapOfDisintegration = require('./effects/SnapOfDisintegration.js');
const TRexAttack = require('./effects/TRexAttack.js');
const TVEffect = require('./effects/TVEffect.js');
const TVGlitch = require('./effects/TVGlitch.js');
const Wisps = require('./effects/Wisps.js');

const Main = imports.ui.main;
const Gio = imports.gi.Gio;
const Meta = imports.gi.Meta;
const Gettext = imports.gettext;
const GLib = imports.gi.GLib;
const Settings = imports.ui.settings;

const UUID = "CinnamonBurnMyWindows@klangman";

Gettext.bindtextdomain(UUID, GLib.get_home_dir() + "/.local/share/locale");

function _(text) {
  let locText = Gettext.dgettext(UUID, text);
  if (locText == text) {
    locText = window._(text);
  }
  return locText;
}

//////////////////////////////////////////////////////////////////////////////////////////
// This extensions modifies the window-close and window-open animations with all kinds  //
// of effects. The effects are implemented using GLSL shaders which are applied to the  //
// window's Clutter.Actor. The extension is actually very simple, much of the           //
// complexity comes from the fact that GNOME Shell usually does not show an animation   //
// when a window is closed in the overview. Several methods need to be monkey-patched   //
// to get this working. For more details, read the other comments in this file...       //
//////////////////////////////////////////////////////////////////////////////////////////

class BurnMyWindows {

   constructor(metaData){
      this.meta = metaData;
   }
   // ------------------------------------------------------------------------ public stuff

   // This function could be called after the extension is enabled, which could be done
   // from GNOME Tweaks, when you log in or when the screen is unlocked.
   enable() {
      // New effects must be registered here and in prefs.js.
      this._ALL_EFFECTS = [
         new Apparition.Effect(),
         new BrokenGlass.Effect(),
         new Doom.Effect(),
         new EnergizeA.Effect(),
         new EnergizeB.Effect(),
         new Fire.Effect(),
         new Glide.Effect(),
         new Glitch.Effect(),
         new Hexagon.Effect(),
         new Incinerate.Effect(),
         new Matrix.Effect(),
         new PaintBrush.Effect(),
         new Pixelate.Effect(),
         new PixelWheel.Effect(),
         new PixelWipe.Effect(),
         new Portal.Effect(),
         new SnapOfDisintegration.Effect(),
         new TRexAttack.Effect(),
         new TVEffect.Effect(),
         new TVGlitch.Effect(),
         new Wisps.Effect(),
      ];

      // Load all of our resources.
      this._resources = Gio.Resource.load(GLib.get_home_dir() + 
         '/.local/share/cinnamon/extensions/' + UUID + '/resources/burn-my-windows.gresource');
      Gio.resources_register(this._resources);

      // Store a reference to the settings object.
      this._settings = new Settings.ExtensionSettings(this, this.meta.uuid);

      // We will use extensionThis to refer to the extension inside the patched methods.
      const extensionThis = this;

      // We will monkey-patch this method. Let's store the original one.
      this._origShouldAnimate         = Main.wm._shouldAnimate;

      // ------------------------------- patching the window animations outside the overview

      // If a window is created, the transitions are set up in the async _mapWindow() of the
      // WindowManager:
      // https://gitlab.gnome.org/GNOME/gnome-shell/-/blob/main/js/ui/windowManager.js#L1436
      // AFAIK, overriding this method is not possible as it's called by a signal to which
      // it is bound via the bind() method. To tweak the async transition anyways, we
      // override the actors ease() method once. We do this in _shouldAnimateActor() which
      // is called right before the ease() in _mapWindow:
      // https://gitlab.gnome.org/GNOME/gnome-shell/-/blob/main/js/ui/windowManager.js#L1465

      // The same trick is done for the window-close animation. This is set up in a similar
      // fashion in the WindowManager's _destroyWindow():
      // https://gitlab.gnome.org/GNOME/gnome-shell/-/blob/main/js/ui/windowManager.js#L1525
      // Here is _shouldAnimateActor() also called right before. So we use it again to
      // monkey-patch the window actor's ease() once.

      // We override WindowManager._shouldAnimateActor() also for another purpose: Usually,
      // it returns false when we are in the overview. This prevents the window animations
      // there. To enable animations in the overview, we check inside the method whether it
      // was called by either _mapWindow or _destroyWindow. If so, we return true. Let's see
      // if this breaks stuff left and right...
      Main.wm._shouldAnimate = function(actor, types) {
         const isNormalWindow = actor.meta_window.window_type == Meta.WindowType.NORMAL;
         const isDialogWindow = actor.meta_window.window_type == Meta.WindowType.MODAL_DIALOG || actor.meta_window.window_type == Meta.WindowType.DIALOG;

         if (isNormalWindow || isDialogWindow) {
            const stack      = (new Error()).stack;
            const forClosing = stack.includes('_destroyWindow@');
            const forOpening = stack.includes('_mapWindow@');

            // This is also called in other cases, for instance when minimizing windows. We are
            // only interested in window opening and window closing for now.
            if (forClosing || forOpening) {
               let effectIdx;
               if (forOpening) {
                  effectIdx = extensionThis._settings.getValue("open-window-effect");
               } else {
                  effectIdx = extensionThis._settings.getValue("close-window-effect");
               }

               // If there is an applicable effect profile, we intercept the ease() method to
               // setup our own effect.
               const chosenEffect = {effect: extensionThis._ALL_EFFECTS[effectIdx], profile: extensionThis._settings};

               if (chosenEffect) {
                  // Store the original ease() method of the actor.
                  const orig = actor.ease;

                  // Temporarily force the new window & closing window effect to be enabled in cinnamon
                  let orig_desktop_effects_map_type = Main.wm.desktop_effects_map_type;
                  let orig_desktop_effects_close_type = Main.wm.desktop_effects_close_type;
                  Main.wm.desktop_effects_map_type = "traditional";
                  Main.wm.desktop_effects_close_type = "traditional";

                  // Now intercept the next call to actor.ease().
                  actor.ease = function(...params) {
                     // There is a really weird issue in GNOME Shell 44: A few non-GTK windows are
                     // resized directly after they are mapped on X11. This happens for instance
                     // for keepassxc after it was closed in the maximized state. As the
                     // _mapWindow() method is called asynchronously, the window is not yet visible
                     // when the resize happens. Hence, our ease-override is called for the resize
                     // animation instead of the window-open or window-close animation. This is not
                     // what we want. So we check again whether the ease() call is for the
                     // window-open or window-close animation. If not, we just call the original
                     // ease() method. See also:
                     // https://github.com/Schneegans/Burn-My-Windows/issues/335
                     const stack      = (new Error()).stack;
                     const forClosing = stack.includes('_destroyWindow@');
                     const forOpening = stack.includes('_mapWindow@');

                     if (forClosing || forOpening) {
                       // Quickly restore the original behavior. Nobody noticed, I guess :D
                       actor.ease = orig;

                       // And then create the effect!
                       extensionThis._setupEffect(actor, forOpening, chosenEffect.effect,
                                                  chosenEffect.profile);
                     } else {
                       orig.apply(this, params);
                     }
                     // Restore the original cinnamon new window & closing window effect settings
                     Main.wm.desktop_effects_map_type = orig_desktop_effects_map_type;
                     Main.wm.desktop_effects_close_type = orig_desktop_effects_close_type
                };

                return true;
               }
            }
         }

         return extensionThis._origShouldAnimate.apply(this, [actor, types]);
      };

    // Make sure to remove any effects if requested by the window manager.
    this._killEffectsSignal =
      global.window_manager.connect('kill-window-effects', (wm, actor) => {
        const shader = actor.get_effect('burn-my-windows-effect');
        if (shader) {
          shader.endAnimation();
        }
      });
  }

  // This function could be called after the extension is uninstalled, disabled in GNOME
  // Tweaks, when you log out or when the screen locks.
  disable() {

    // Free all effect resources.
    this._ALL_EFFECTS = [];

    // Unregister our resources.
    Gio.resources_unregister(this._resources);

    // Disable the window-picking D-Bus API.
    //this._windowPicker.unexport();

    global.window_manager.disconnect(this._killEffectsSignal);

    // Restore the original window-open and window-close animations.
    Main.wm._shouldAnimate = this._origShouldAnimate;

    this._settings = null;
  }

  // This method adds the given effect using the settings from the given profile to the
  // given actor.
  _setupEffect(actor, forOpening, effect, profile) {

    // There is the weird case where an animation is already ongoing. This happens when a
    // window is closed which has been created before the session was started (e.g. when
    // GNOME Shell has been restarted in the meantime).
    const oldShader = actor.get_effect('burn-my-windows-effect');
    if (oldShader) {
      oldShader.endAnimation();
    }

    // If we are currently performing integration test, all animations are set to a fixed
    // duration and show a fixed frame from the middle of the animation.
    const testMode = this._settings.getValue('test-mode');

    // The following is used to tweak the ongoing transitions of a window actor. Usually
    // windows are faded in / out scaled up / down slightly by GNOME Shell. Here, we tweak
    // the transitions so that nothing changes. The window stays opaque and is scaled to
    // actorScale.
    const actorScale =
      effect.constructor.getActorScale(this._settings, forOpening, actor);

    // All scaling is relative to the window's center.
    actor.set_pivot_point(0.5, 0.5);
    actor.opacity = 255;
    actor.scale_x = actorScale.x;
    actor.scale_y = actorScale.y;

    // If we are in the overview, we have to enlarge the window's clone as well. We also
    // disable the clone's overlay (e.g. its icon, name, and close button) during the
    // animation.
    if (actor._bmwOverviewClone) {
      actor._bmwOverviewClone.overlayEnabled = false;
      actor._bmwOverviewCloneContainer.set_pivot_point(0.5, 0.5);
      actor._bmwOverviewCloneContainer.scale_x = actorScale.x;
      actor._bmwOverviewCloneContainer.scale_y = actorScale.y;
    }

    // Now add a cool shader to our window actor!
    const shader = effect.shaderFactory.getShader();
    actor.add_effect_with_name('burn-my-windows-effect', shader);

    // At the end of the animation, we restore the scale of the overview clone (if any)
    // and call the methods which would have been called by the original ease() calls at
    // the end of the standard fade-in animation.
    const endID = shader.connect('end-animation', () => {
      shader.disconnect(endID);

      if (actor._bmwOverviewClone) {
        actor._bmwOverviewClone.overlayEnabled   = true;
        actor._bmwOverviewCloneContainer.scale_x = 1.0;
        actor._bmwOverviewCloneContainer.scale_y = 1.0;
      }

      // Restore the original scale of the window actor.
      actor.scale_x = 1.0;
      actor.scale_y = 1.0;

      // Remove the shader and mark it being re-usable for future animations.
      actor.remove_effect(shader);
      shader.returnToFactory();

      // Finally, once the animation is done or interrupted, we call the methods which
      // should have been called by the original ease() methods.
      // https://gitlab.gnome.org/GNOME/gnome-shell/-/blob/main/js/ui/windowManager.js#L1487
      // https://gitlab.gnome.org/GNOME/gnome-shell/-/blob/main/js/ui/windowManager.js#L1558.
      if (forOpening) {
        Main.wm._mapWindowDone(global.window_manager, actor);
      } else {
        Main.wm._destroyWindowDone(global.window_manager, actor);
      }
    });

    // To make things deterministic during testing, we set the effect duration to 8
    // seconds.
    const duration = testMode ?
      8000 :
      profile.getValue(effect.constructor.getNick() + '-animation-time');

    // Finally start the animation!
    shader.beginAnimation(profile, forOpening, testMode, duration, actor);
  }

  // This is required to enable window-close animations in the overview. See the comment
  // for Workspace.prototype._windowRemoved above for an explanation.
  _shouldDestroy(workspace, metaWindow) {
    const index = workspace._lookupIndex(metaWindow);
    if (index == -1) {
      return true;
    }

    const actor  = workspace._windows[index]._windowActor;
    const shader = actor.get_effect('burn-my-windows-effect');

    return shader == null;
  }
}

let extension = null;
function enable() {
	extension.enable();
}

function disable() {
	extension.disable();
	extension = null;
}

function init(metadata) {
	if(!extension) {
		extension = new BurnMyWindows(metadata);
	}
}