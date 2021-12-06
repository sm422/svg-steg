  const svgCharacterCoorObj = {
    s: [1,0,10,0,1,0,1,5,1,5,10,5,10,5,10,10,10,10,1,10],
    t: [1,0,10,0,5,0,5,10],
    e: [1,0,10,0,1,0,1,5,1,5,10,5,1,5,1,10,1,10,10,10],
    g: [1,0,10,0,1,0,1,10,1,10,10,10,10,10,10,5,10,5,5,5]
  };
  let selectedPath;

  document.getElementById('CreationSvgSelector').addEventListener('change', loadSvgThatWillBeUsedToHideTest);

  document.getElementById('CreateStegSvgButton').addEventListener('click', createStegSvg);

  document.getElementById('ExtractionSvgSelector').addEventListener('change', extractStegText);

  /* Load the SVG that will be used be used to hide the text and insert it into
  the Creation display zone. Then create an event listener on each path in the
  SVG that will allow the user to select the path which will have the steg text
  path appended to it. */
  function loadSvgThatWillBeUsedToHideTest(event) {
    const fr = new FileReader();
    fr.onload = () => {
       document.getElementById('CreationDisplayZone').innerHTML = fr.result;
       document.querySelectorAll('path').forEach((path, _) => {
         path.addEventListener('click', (event) => {
           selectedPath = event.target;
        });
       });
    };
    fr.readAsText(event.target.files[0]);
  }

  /* Top level function used to perform the appened path steganography*/
  function createStegSvg() {
    const stegTextCoordinates = generateStegTextCoordinates(document.getElementById('HiddenText').value)
    const minMaxCoordinatesOfSvgPath = getMinMaxCoordinatesOfSvgPath(selectedPath.getAttribute('d'));
    const translatedAndScaledStegTextPoints = translateAndScalePoint(...minMaxCoordinatesOfSvgPath, stegTextCoordinates);
    const translatedAndScaledStegTextDValue = generateStegTextDValue(translatedAndScaledStegTextPoints);
    selectedPath.setAttribute('d', selectedPath.getAttribute('d')+translatedAndScaledStegTextDValue);
  }

  /* Generates a two dimensional array of SVG path coordinates. One is used array
  per character.*/
  function generateStegTextCoordinates(textToHide) {
    const textArray = textToHide.split('');
    let stegTextCoordinates = [];
    /* for each character create an array of SVG path coordinates using the
    svgCharacterCoorObj as a staring point*/
    textArray.forEach((character, i) => {
      let ray = Array.from(svgCharacterCoorObj[character], (coordinate, j) => {
        /* if its an even positon in the svgCharacterCoorObj then it is an X axis point */
        if(j % 2 == 0) {
          /* The X coordinates need to be increased with each character so that each
          character can be placed in a row with each other.*/
          return coordinate + (i*10);
        } else {
          /* since the charaters are placed in a row, their y axis point do not need
          to be alterd*/
          return coordinate;
        }
      });
      stegTextCoordinates = stegTextCoordinates.concat(ray);
    });
    return stegTextCoordinates;
  }

  /* This function works with the example SVGs, however it is not robust at all.
  It does not handle paths with V or H instructions, and it also struggles with
  paths that do not alternate between X coordinate and Y coordinate. Far more
  logic and parsing is need to make this function suitable for most SVGs*/
  function getMinMaxCoordinatesOfSvgPath(d) {
    const coordinates = d.split(/[^\d.-]/g).filter(value => value != '');
    let minX = Number(coordinates[0]);
    let maxX = Number(coordinates[0]);
    let minY = Number(coordinates[1]);
    let maxY = Number(coordinates[1]);
    coordinates.forEach((element, i) => {
      try {
        value = Number(element)
        /* if the coordinate has a even index then it is a Y value */
        if(i % 2 != 0) {
          if (value < minY) minY = value;
          if (value > maxY) maxY = value;
        } else {
          if(value < minX) minX = value;
          if(value > maxX) maxX = value;
        }
      } catch(e) {}
    });
    return [
      minX,
      maxX,
      minY,
      maxY
    ]
  }

  /* There's probably a more mathematically sophisticated way of doing this,
  but this method works as a proof of concept*/
  function translateAndScalePoint(minX, maxX, minY, maxY, coordinates){
    /* approximate the middle of the path coordinates */
    const middleX = (Math.abs(maxX) - Math.abs(minX)) / 2 + minX;
    const middleY = (Math.abs(maxY) - Math.abs(minY)) / 2 + minY;
    /* Compute a value to scale the hidden text coordinates by.
    Use one tenth the range as the scale value. The scale value
    needs to make sure the hidden text coordinates fit inside the
    path and also do not look out of place*/
    const scaleValueX = (Math.abs(maxX) - Math.abs(minX)) * .1;
    const scaleValueY = (Math.abs(maxY) - Math.abs(minY)) * .1;
    /* set the starting points of the new hidden text coordinates
    near the middle of the path */
    const newStegMinX = middleX - scaleValueX;
    const newStegMinY = middleY - scaleValueY;
    /* translate and scale the hidden text coordinates */
    const newCoordinates = Array.from(coordinates, (coordinate, i) => {
      if((i+1) % 2 == 1) {
        return ((scaleValueX * coordinate / 10) + newStegMinX);
      } else {
        return ((scaleValueY * coordinate / 10) + newStegMinY);
      }
    });
    return newCoordinates;
  }

  /* Creates a d value in the format of
  "M{coordinate},{coordinate}L{coordinate},{coordinate}"*/
  function generateStegTextDValue(coordinates) {
    let dValue = '';
    let isM = true;
    /* sets the '.177' value with will act as a flag for the extration of the svg
    text */
    coordinates[0] = Math.trunc(coordinates[0]) + 0.177
    for(let i = 0; i < coordinates.length; i+=2) {
      if (isM) {
        dValue+=`M${coordinates[i].toFixed(3)},${coordinates[i+1].toFixed(3)}`;
        isM = false;
      } else {
        dValue+=`L${coordinates[i].toFixed(3)},${coordinates[i+1].toFixed(3)}`;
        isM = true;
      }
    }
    return dValue;
  }

  /* Top level function for extracting hidden text for an SVG with hidden path steganography.
  Loads the SVG contianing the hidden text */
  function extractStegText(event) {
    const fr = new FileReader();
    fr.onload = () => {
       const svgStegTextPath = exractSvgStegTextPathValues(fr.result);
       const minMaxCoordinatesOfSvg = getMinMaxCoordinatesOfSvgPath(svgStegTextPath);
       const svg = createSvgOfStegText(...minMaxCoordinatesOfSvg, svgStegTextPath)
       /* display extracted text as an SVG */
       document.getElementById('ExtractionDisplayZone').innerHTML = svg.outerHTML;
    };
    fr.readAsText(event.target.files[0]);
  }

  /* Pulls the d value for the hidden text out of the SVG. Uses '.177' as a flag */
  function exractSvgStegTextPathValues(svg) {
    const reversedSvg = svg.split("").reverse().join("");
    const valueBetweenFlagAndM = reversedSvg.match(/(771\.)((.|\n)*?)([M])/g)[0].split("").reverse().join("");
    const valueBetweenFlagAndClosingBraket = svg.match(/(?<=(\.177))((.|\n)*?)(?=\>)/g)[0].replace('"', '');
    return valueBetweenFlagAndM + valueBetweenFlagAndClosingBraket;
  }

  /* Creates an SVG element with containing a single path with
  the extracted d value. */
  function createSvgOfStegText(minX, maxX, minY, maxY, coordinates) {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttributeNS("http://www.w3.org/2000/xmlns/", "xmlns:xlink", "http://www.w3.org/1999/xlink");
    /* adjust view box so that the extracted text is easy to view. */
    svg.setAttribute('viewBox', `${minX} ${minY} ${maxX-minX} ${maxY-minY}`);
    const path = document. createElementNS("http://www.w3.org/2000/svg", "path")
    path.setAttribute('d', coordinates);
    path.setAttribute('stroke', 'black');
    svg.appendChild(path);
    return svg;
  }
