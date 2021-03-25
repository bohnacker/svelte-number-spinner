export function hasClass(elem, className) {
  let currClass = elem.getAttribute('class');
  return new RegExp(' ' + className + ' ').test(' ' + currClass + ' ');
}

export function addClass(elem, className) {
  if (!hasClass(elem, className)) {
    let currClass = elem.getAttribute('class');
    elem.setAttribute('class', currClass ? currClass + ' ' + className : className);
  }
  return elem;
}

export function removeClass(elem, className) {
  let currClass = elem.getAttribute('class');
  if (currClass) {
    let newClass = ' ' + currClass.replace(/[\t\r\n]/g, ' ') + ' ';
    if (hasClass(elem, className)) {
      while (newClass.indexOf(' ' + className + ' ') >= 0) {
        newClass = newClass.replace(' ' + className + ' ', ' ');
      }
      newClass = newClass.replace(/^\s+|\s+$/g, '')
      if (newClass == '') {
        elem.removeAttribute('class');
      } else {
        elem.setAttribute('class', newClass);
      }
    }
  }
  return elem;
}