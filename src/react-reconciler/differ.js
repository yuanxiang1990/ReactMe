import {tag, createFiber} from "./FiberNode";
import {createWorkInProgress} from "./index";

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
    if (typeof oldNode.props.key !== "undefined" && typeof newNode.props.key !== "undefined") {
        return oldNode.props.key === newNode.props.key;
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
    if (typeof element.type === "function") {
        newFiber.stateNode = new element.type(element.props);
        newFiber.stateNode._reactInternalFiber = newFiber;
    }
    else if (typeof element.type === "string") {
        let stateNode = document.createElement(element.type);
        stateNode.__reactInternalInstance = newFiber;
        newFiber.stateNode = stateNode;
    }
    else {
        let stateNode = document.createTextNode(element)
        stateNode.__reactInternalInstance = newFiber;
        newFiber.stateNode = stateNode;
    }
    return newFiber;
}

/**
 * 标记已存在的节点
 */
function mapExistingChildren(oldChildren) {
    const existingChildren = new Map();
    let node = oldChildren;
    while (node) {
        let key = node.props && node.props.key;
        if (typeof key !== "undefined" && String(key)) {
            existingChildren.set(key, node);
        }
        node = node.sibling;
    }
    return existingChildren;
}

/**
 * 子节点differ算法
 * @param oldChildren 旧的子节点对象
 * @param newChildren 新的子节点对象
 */
function differChildren(returnFiber, oldChildren, newChildren) {
    let i = 0, j = 0;//i:simulate indx j:new array index
    let newFirstFiber, preFiber;
    newChildren = !Array.isArray(newChildren) ? [newChildren] : newChildren;
    const existingChildren = mapExistingChildren(oldChildren);
    let oldNode = oldChildren;
    while (j < newChildren.length) {
        var newItem = newChildren[j];
        /**
         * 存在当前element是数组的情况
         */
        if (Array.isArray(newItem)) {
            newChildren.splice(j, 1, ...newItem);
            newItem = newChildren[j];
        }

        if (sameNode(oldNode, newChildren[j])) {
            let fiber = createWorkInProgress(oldNode);//创建新的fiber节点
            fiber.return = returnFiber;
            fiber.stateNode = oldNode.stateNode;
            fiber.stateNode._reactInternalFiber = fiber;
            fiber.props = newItem.props || {};
            fiber.sibling = null;
            if (!preFiber) {
                newFirstFiber = fiber;
            }
            else {
                preFiber.sibling = fiber;
            }
            oldNode = oldNode.sibling;
            j++;
            preFiber = fiber;
            continue;
        }
        if (oldNode) {
            if (sameNode(oldNode.sibling, newItem)) {
                remove(oldNode);
                oldNode = oldNode.sibling;
            } else {
                insert(j, newItem);
                j++;
            }
        } else {
            insert(j, newItem);
            j++;
        }
    }
    /**
     * 移除多余的dom元素
     */
    while (oldNode) {
        remove(oldNode);
        oldNode = oldNode.sibling;
    }

    // 记录remove操作
    function remove(item) {
        item.effectTag = Effect.DELETION;
        returnFiber.effects.push(item);
    }

    // 记录insert操作
    function insert(j, item) {
        let fiber = null;
        /**
         * 重复使用以前的fiber节点以节省性能
         */
        const existingChild = item.props && existingChildren.get(item.props.key);
        if (existingChild && (existingChild.type === item.type)) {
            fiber = createWorkInProgress(existingChild);
            fiber.stateNode = existingChild.stateNode;
        }
        else {
            fiber = createFiberFromElement(item);
        }
        fiber.effectTag = Effect.PLACEMENT;
        fiber.return = returnFiber;
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
 * 普通dom组件更新
 * @param workInProgress
 * @returns {*}
 */
export function updateHostComponent(workInProgress) {
    let oldFiber, newFiber, element = workInProgress.props.children;
    /**
     * 无子节点的情况
     */
    if (!element) {
        return null;
    }
    oldFiber = workInProgress.child;
    /**
     * 子节点differ算法
     */
    newFiber = differChildren(workInProgress, workInProgress.alternate && workInProgress.alternate.child, element);
    newFiber && (newFiber.child = (oldFiber ? oldFiber.child : null));
    return workInProgress.child = newFiber;//链接新节点到workInprogress树
}

/**
 * class类型组件更新
 * @param workInProgress
 * @returns {*}
 */
export function updateClassComponent(workInProgress) {
    let oldFiber, newFiber, element, instance = workInProgress.stateNode;
    let newState = Object.assign(instance.state || {}, instance._partialState || {});
    let oldProps = instance.props;
    let newProps = workInProgress.props;
    const getDerivedStateFromProps = instance.constructor.getDerivedStateFromProps;
    /**
     * 实现getDerivedStateFromProps生命周期
     */
    if (typeof getDerivedStateFromProps === "function") {
        const state = getDerivedStateFromProps(newProps, newState);
        if (state) {
            newState = Object.assign(newState, state);
        }
    }
    /**
     * 实现componentWillReceiveProps生命周期
     * @type {boolean}
     */
    let hasNewLifecycles = typeof getDerivedStateFromProps === 'function' || typeof instance.getSnapshotBeforeUpdate === 'function';
    if (!hasNewLifecycles && (typeof instance.UNSAFE_componentWillReceiveProps === 'function' || typeof instance.componentWillReceiveProps === 'function')) {
        if (oldProps !== newProps && workInProgress.alternate) {
            //父节点重新render后新创建的element的props和之前fiber的stateNode的props地址不一样！！！
            callComponentWillReceiveProps(instance, newProps);
        }
    }
    instance.props = newProps;
    /**
     * 处理shouldComponentUpdate生命周期
     */
    if (!checkShouldUpdate(workInProgress, newProps, newState)) {
        cloneChildFibers(workInProgress);
        return workInProgress.child;
    }
    instance.state = newState;
    workInProgress.memoizedState = {...newState};//和stateNode指向不同对象，防止更改stateNode时影响到外层memoizedState
    element = instance.render();//获取最新的element
    oldFiber = workInProgress.child;
    /**
     * 子节点differ算法
     */
    newFiber = differChildren(workInProgress, workInProgress.alternate && workInProgress.alternate.child, element);
    newFiber && (newFiber.child = (oldFiber ? oldFiber.child : null));
    return workInProgress.child = newFiber;//链接新节点到workInprogress树
}


function checkShouldUpdate(workInProgress, newProps, newState) {
    let instance = workInProgress.stateNode;
    if (workInProgress.alternate && typeof instance.shouldComponentUpdate === "function") {
        return instance.shouldComponentUpdate(newProps, newState);
    }
    return true;
}

function callComponentWillReceiveProps(instance, newProps) {
    if (typeof instance.componentWillReceiveProps === 'function') {
        instance.componentWillReceiveProps(newProps);
    }
    if (typeof instance.UNSAFE_componentWillReceiveProps === 'function') {
        instance.UNSAFE_componentWillReceiveProps(newProps);
    }
}

function cloneChildFibers(workInProgress) {
    if (workInProgress.child === null) {
        return
    }
    let currentChild = workInProgress.child;
    let newChild = createWorkInProgress(workInProgress.child);
    newChild.return = workInProgress;
    workInProgress.child = newChild;
}