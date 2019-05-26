const interactiveEventTypeNames = [
    'blur',
    'cancel',
    'click',
    'close',
    'contextMenu',
    'copy',
    'cut',
    'auxClick',
    'doubleClick',
    'dragEnd',
    'dragStart',
    'drop',
    'focus',
    'input',
    'invalid',
    'keyDown',
    'keyPress',
    'keyUp',
    'mouseDown',
    'mouseUp',
    'paste',
    'pause',
    'play',
    'pointerCancel',
    'pointerDown',
    'pointerUp',
    'rateChange',
    'reset',
    'seeked',
    'submit',
    'touchCancel',
    'touchEnd',
    'touchStart',
    'volumeChange',
]

const nonInteractiveEventTypeNames = [
    'abort',
    'animationEnd',
    'animationIteration',
    'animationStart',
    'canPlay',
    'canPlayThrough',
    'drag',
    'dragEnter',
    'dragExit',
    'dragLeave',
    'dragOver',
    'durationChange',
    'emptied',
    'encrypted',
    'ended',
    'error',
    'gotPointerCapture',
    'load',
    'loadedData',
    'loadedMetadata',
    'loadStart',
    'lostPointerCapture',
    'mouseMove',
    'mouseOut',
    'mouseOver',
    'playing',
    'pointerMove',
    'pointerOut',
    'pointerOver',
    'progress',
    'scroll',
    'seeking',
    'stalled',
    'suspend',
    'timeUpdate',
    'toggle',
    'touchMove',
    'transitionEnd',
    'waiting',
    'wheel',
]

export const eventTypeNames = [...interactiveEventTypeNames, ...nonInteractiveEventTypeNames]
export const bubblePhaseRegistrationNames = eventTypeNames.map(
    name => 'on' + name[0].toLocaleUpperCase() + name.slice(1)
)
export const capturePhaseRegistrationNames = bubblePhaseRegistrationNames.map(
    name => name + 'Capture'
)
export const registrationNames = [...bubblePhaseRegistrationNames, ...capturePhaseRegistrationNames]

export function isInteractiveEvent(eventType) {
    return interactiveEventTypeNames.includes(eventType)
}