import {tag, createFiber} from "./FiberNode";

/**
 * effect tag
 */
export const Effect = {
    PLACEMENT: 1,
    DELETION: 2,
    UPDATE: 3
}
const effects = [];

function sameNode(oldNode, newNode) {
    if (!oldNode || !newNode) {
        return false;
    }
    if (typeof oldNode.type === 'undefined' && typeof newNode.type === 'undefined') {
        return oldNode.stateNode.nodeValue == newNode;
    }
    return oldNode && newNode && oldNode.type === newNode.type;
}


function createFiberFromElement(element) {
    let newFiber;
    if (typeof element.type === "function") {
        newFiber = createFiber(
            tag.ClassComponent,
            element.type,
            element.props || {},
            element.key
        );
    }
    else {
        newFiber = createFiber(
            tag.HostComponent,
            element.type,
            element.props || {},
            element.key
        );
    }
    return newFiber;
}

/**
 * 子节点differ算法
 * @param oldChildren
 * @param newChildren
 * @returns {{moves: Array, children: Array}}
 */
function differChildren(currentFiber, newChildren) {
    let i = 0, j = 0;//i:simulate indx j:new array index
    let newFirstFiber, preFiber, oldChildren = fiberListToArray(currentFiber.alternate && currentFiber.alternate.child);
    newChildren = !Array.isArray(newChildren) ? [newChildren] : newChildren;
    while (j < newChildren.length) {
        var newItem = newChildren[j];
        if (sameNode(oldChildren[i], newChildren[j])) {
            let fiber = createFiberFromElement(newItem);//创建新的fiber节点
            fiber.stateNode = oldChildren[i].stateNode;
            fiber.alternate = oldChildren[i] || null;//储存旧的节点
            fiber.return = currentFiber;
            fiber.updateQueue = oldChildren[i].updateQueue;
            fiber.stateNode._reactInternalFiber = fiber;
            if (!preFiber) {
                newFirstFiber = fiber;
            }
            else {
                preFiber.sibling = fiber;
            }
            i++;
            j++;
            preFiber = fiber;
            continue;
        }
        if (oldChildren[i]) {
            if (sameNode(oldChildren[i + 1], newItem)) {
                remove(oldChildren[i]);
                oldChildren.splice(i, 1);
                //i++;
                //j++;
            } else {
                oldChildren.splice(i, 0, newItem);
                insert(j, newItem);
                i++;
                j++;
            }
        } else {
            oldChildren.push(newItem);
            insert(j, newItem);
            i++;
            j++;
        }
    }
    /**
     * 移除多余的dom元素
     */
    while (oldChildren.length > newChildren.length) {
        remove(oldChildren[oldChildren.length - 1]);
        oldChildren.splice(oldChildren.length - 1, 1);
    }

    // 记录remove操作
    function remove(item) {
        item.effectTag = Effect.DELETION;
        currentFiber.effects.push(item);
    }

    // 记录insert操作
    function insert(j, item) {
        let fiber = createFiberFromElement(item);
        fiber.effectTag = Effect.PLACEMENT;
        if (typeof item.type === "function") {
            fiber.stateNode = new item.type(item.props);
            fiber.props = {
                children: fiber.stateNode.render()
            }
            fiber.stateNode._reactInternalFiber = fiber;
        }
        else if (typeof item.type === "string") {
            let stateNode = document.createElement(item.type);
            stateNode.__reactInternalInstance = fiber;
            fiber.stateNode = stateNode;
        }
        else {
            let stateNode = document.createTextNode(item)
            stateNode.__reactInternalInstance = fiber;
            fiber.stateNode = stateNode;
        }
        fiber.return = currentFiber;
        if (preFiber) {
            preFiber.sibling = fiber;
        }
        else {
            newFirstFiber = fiber;
        }
        preFiber = fiber;
    }

    return newFirstFiber;
}

/**
 * 链表换数组
 * @param fiber
 * @returns {Array}
 */
function fiberListToArray(fiber) {
    const children = [];
    if (fiber) {
        children.push(fiber)
        let sib = fiber.sibling;
        while (sib) {
            children.push(sib);
            sib = sib.sibling;
        }
    }
    return children
}


export function updateHostComponent(currentFiber) {
    let oldFiber, newFiber, element = currentFiber.props.children;
    /**
     * 无子节点的情况
     */
    if (!element) {
        return null;
    }
    oldFiber = currentFiber.child;
    /**
     * 子节点differ算法
     */
    newFiber = differChildren(currentFiber, element);
    newFiber && (newFiber.child = (oldFiber ? oldFiber.child : null));
    return currentFiber.child = newFiber;//链接新节点到workInprogress树
}


export function updateClassComponent(currentFiber) {
    let oldFiber, newFiber, element;
    if (currentFiber.stateNode._partialState) {
        const state = currentFiber.stateNode.state;
        currentFiber.stateNode.state = {...state, ...currentFiber.stateNode._partialState};
        currentFiber.stateNode._partialState = null;

    }
    element = currentFiber.stateNode.render();//获取最新的element
    oldFiber = currentFiber.child;
    /**
     * 子节点differ算法
     */
    newFiber = differChildren(currentFiber, element);
    newFiber && (newFiber.child = (oldFiber ? oldFiber.child : null));
    return currentFiber.child = newFiber;//链接新节点到workInprogress树
}
