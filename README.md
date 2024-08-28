# CinnamonBurnMyWindows

Window create and destroy effects for the Cinnamon desktop based on the Gnome extension Burn-my-Windows

![screen shot](CinnamonBurnMyWindows@klangman/screenshot.png)

This is a Cinnamon port of the Gnome extension Burn-my-Windows which can be found here: 

https://github.com/Schneegans/Burn-My-Windows

**Please go to the above link and support their project since this is merely a port of their fine work!**

### Currently these effects are working in Cinnamon:

- Apparition
- Energize A
- Energize B
- Glide
- Glitch
- Hexagon
- Incinerate
- Pixelate
- Pixel Wheel
- Pixel Wipe
- Portal
- TV Effect
- TV Glitch
- Wisps

### The following effects are currently disabled because Cinnamon is missing an API call. I am hoping to find a way around this issue:

- Broken Glass
- Doom
- Fire
- Matrix
- PaintBrush
- Snap Of Disintegration
- TRex Attack

## Possible future enhancements

- Randomized effect selection for each use.
- Specifying effects for specific windows.

## Installation

At some point I will submit this extension to cinnamon-spices so you can install it directly from the desktop, but for now you need to manually install using these instructions:

1. Clone the repo (or Download the latest repo by clinking on the green "code" button above then click "Download ZIP")
    ```
    git clone git@github.com:klangman/CinnamonBurnMyWindows.git
    ```
2. If you downloaded a ZIP, decompress the zip into a directory of your choice
    ```
    unzip ~/Downloads/CinnamonBurnMyWindows-main.zip
    ```
3. Change directory to the cloned repo or the decompressed ZIP file
4. Link the "CinnamonBurnMyWindows@klangman" directory into the "~/.local/share/cinnamon/extensions/" directory
    ```
    ln -s $PWD/CinnamonBurnMyWindows@klangman ~/.local/share/cinnamon/extensions/CinnamonBurnMyWindows@klangman
    ```
5. Open the Cinnamon Extensions application (Menu->Preferences->Extensions)
6. Select the "Burn My Windows" entry and then click the "+" button at the bottom of the Extensions window
7. Use the "gears" icon to open the CinnamonBurnMyWindows setting window and setup your preferred behaviour

## Feedback

Feel free to create an issue here on Github to give me feedback or to report any issues you find. **Please DO NOT open any issues against the original Gnome project. Open an issue here first so I can check if the issue has anything to do with my changes to support Cinnamon**

If you like this extension, please consider making a donation to the author of the original Gnome extension which makes up the vast majority of the code for this Cinnamon extension. Donation links can be found on this Github page:
 
https://github.com/Schneegans/Burn-My-Windows

If you want to help others find this Cinnamon extension, consider staring it so that more people might learn of it's existence.
Also, the more stars it gets the more encouragement I'll have to continue working on it.
Thanks!
