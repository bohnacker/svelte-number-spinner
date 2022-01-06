function noop() { }
function assign(tar, src) {
    // @ts-ignore
    for (const k in src)
        tar[k] = src[k];
    return tar;
}
function run(fn) {
    return fn();
}
function blank_object() {
    return Object.create(null);
}
function run_all(fns) {
    fns.forEach(run);
}
function is_function(thing) {
    return typeof thing === 'function';
}
function safe_not_equal(a, b) {
    return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
}
function is_empty(obj) {
    return Object.keys(obj).length === 0;
}
function exclude_internal_props(props) {
    const result = {};
    for (const k in props)
        if (k[0] !== '$')
            result[k] = props[k];
    return result;
}
function null_to_empty(value) {
    return value == null ? '' : value;
}

function append(target, node) {
    target.appendChild(node);
}
function insert(target, node, anchor) {
    target.insertBefore(node, anchor || null);
}
function detach(node) {
    node.parentNode.removeChild(node);
}
function element(name) {
    return document.createElement(name);
}
function text(data) {
    return document.createTextNode(data);
}
function space() {
    return text(' ');
}
function listen(node, event, handler, options) {
    node.addEventListener(event, handler, options);
    return () => node.removeEventListener(event, handler, options);
}
function prevent_default(fn) {
    return function (event) {
        event.preventDefault();
        // @ts-ignore
        return fn.call(this, event);
    };
}
function stop_propagation(fn) {
    return function (event) {
        event.stopPropagation();
        // @ts-ignore
        return fn.call(this, event);
    };
}
function attr(node, attribute, value) {
    if (value == null)
        node.removeAttribute(attribute);
    else if (node.getAttribute(attribute) !== value)
        node.setAttribute(attribute, value);
}
function children(element) {
    return Array.from(element.childNodes);
}
function set_input_value(input, value) {
    input.value = value == null ? '' : value;
}
function toggle_class(element, name, toggle) {
    element.classList[toggle ? 'add' : 'remove'](name);
}
function custom_event(type, detail) {
    const e = document.createEvent('CustomEvent');
    e.initCustomEvent(type, false, false, detail);
    return e;
}

let current_component;
function set_current_component(component) {
    current_component = component;
}
function get_current_component() {
    if (!current_component)
        throw new Error('Function called outside component initialization');
    return current_component;
}
function onMount(fn) {
    get_current_component().$$.on_mount.push(fn);
}
function createEventDispatcher() {
    const component = get_current_component();
    return (type, detail) => {
        const callbacks = component.$$.callbacks[type];
        if (callbacks) {
            // TODO are there situations where events could be dispatched
            // in a server (non-DOM) environment?
            const event = custom_event(type, detail);
            callbacks.slice().forEach(fn => {
                fn.call(component, event);
            });
        }
    };
}
// TODO figure out if we still want to support
// shorthand events, or if we want to implement
// a real bubbling mechanism
function bubble(component, event) {
    const callbacks = component.$$.callbacks[event.type];
    if (callbacks) {
        callbacks.slice().forEach(fn => fn(event));
    }
}

const dirty_components = [];
const binding_callbacks = [];
const render_callbacks = [];
const flush_callbacks = [];
const resolved_promise = Promise.resolve();
let update_scheduled = false;
function schedule_update() {
    if (!update_scheduled) {
        update_scheduled = true;
        resolved_promise.then(flush);
    }
}
function tick() {
    schedule_update();
    return resolved_promise;
}
function add_render_callback(fn) {
    render_callbacks.push(fn);
}
let flushing = false;
const seen_callbacks = new Set();
function flush() {
    if (flushing)
        return;
    flushing = true;
    do {
        // first, call beforeUpdate functions
        // and update components
        for (let i = 0; i < dirty_components.length; i += 1) {
            const component = dirty_components[i];
            set_current_component(component);
            update(component.$$);
        }
        set_current_component(null);
        dirty_components.length = 0;
        while (binding_callbacks.length)
            binding_callbacks.pop()();
        // then, once components are updated, call
        // afterUpdate functions. This may cause
        // subsequent updates...
        for (let i = 0; i < render_callbacks.length; i += 1) {
            const callback = render_callbacks[i];
            if (!seen_callbacks.has(callback)) {
                // ...so guard against infinite loops
                seen_callbacks.add(callback);
                callback();
            }
        }
        render_callbacks.length = 0;
    } while (dirty_components.length);
    while (flush_callbacks.length) {
        flush_callbacks.pop()();
    }
    update_scheduled = false;
    flushing = false;
    seen_callbacks.clear();
}
function update($$) {
    if ($$.fragment !== null) {
        $$.update();
        run_all($$.before_update);
        const dirty = $$.dirty;
        $$.dirty = [-1];
        $$.fragment && $$.fragment.p($$.ctx, dirty);
        $$.after_update.forEach(add_render_callback);
    }
}
const outroing = new Set();
function transition_in(block, local) {
    if (block && block.i) {
        outroing.delete(block);
        block.i(local);
    }
}

const globals = (typeof window !== 'undefined'
    ? window
    : typeof globalThis !== 'undefined'
        ? globalThis
        : global);
function mount_component(component, target, anchor, customElement) {
    const { fragment, on_mount, on_destroy, after_update } = component.$$;
    fragment && fragment.m(target, anchor);
    if (!customElement) {
        // onMount happens before the initial afterUpdate
        add_render_callback(() => {
            const new_on_destroy = on_mount.map(run).filter(is_function);
            if (on_destroy) {
                on_destroy.push(...new_on_destroy);
            }
            else {
                // Edge case - component was destroyed immediately,
                // most likely as a result of a binding initialising
                run_all(new_on_destroy);
            }
            component.$$.on_mount = [];
        });
    }
    after_update.forEach(add_render_callback);
}
function destroy_component(component, detaching) {
    const $$ = component.$$;
    if ($$.fragment !== null) {
        run_all($$.on_destroy);
        $$.fragment && $$.fragment.d(detaching);
        // TODO null out other refs, including component.$$ (but need to
        // preserve final state?)
        $$.on_destroy = $$.fragment = null;
        $$.ctx = [];
    }
}
function make_dirty(component, i) {
    if (component.$$.dirty[0] === -1) {
        dirty_components.push(component);
        schedule_update();
        component.$$.dirty.fill(0);
    }
    component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
}
function init(component, options, instance, create_fragment, not_equal, props, dirty = [-1]) {
    const parent_component = current_component;
    set_current_component(component);
    const $$ = component.$$ = {
        fragment: null,
        ctx: null,
        // state
        props,
        update: noop,
        not_equal,
        bound: blank_object(),
        // lifecycle
        on_mount: [],
        on_destroy: [],
        on_disconnect: [],
        before_update: [],
        after_update: [],
        context: new Map(parent_component ? parent_component.$$.context : options.context || []),
        // everything else
        callbacks: blank_object(),
        dirty,
        skip_bound: false
    };
    let ready = false;
    $$.ctx = instance
        ? instance(component, options.props || {}, (i, ret, ...rest) => {
            const value = rest.length ? rest[0] : ret;
            if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                if (!$$.skip_bound && $$.bound[i])
                    $$.bound[i](value);
                if (ready)
                    make_dirty(component, i);
            }
            return ret;
        })
        : [];
    $$.update();
    ready = true;
    run_all($$.before_update);
    // `false` as a special case of no DOM component
    $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
    if (options.target) {
        if (options.hydrate) {
            const nodes = children(options.target);
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            $$.fragment && $$.fragment.l(nodes);
            nodes.forEach(detach);
        }
        else {
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            $$.fragment && $$.fragment.c();
        }
        if (options.intro)
            transition_in(component.$$.fragment);
        mount_component(component, options.target, options.anchor, options.customElement);
        flush();
    }
    set_current_component(parent_component);
}
/**
 * Base class for Svelte components. Used when dev=false.
 */
class SvelteComponent {
    $destroy() {
        destroy_component(this, 1);
        this.$destroy = noop;
    }
    $on(type, callback) {
        const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
        callbacks.push(callback);
        return () => {
            const index = callbacks.indexOf(callback);
            if (index !== -1)
                callbacks.splice(index, 1);
        };
    }
    $set($$props) {
        if (this.$$set && !is_empty($$props)) {
            this.$$.skip_bound = true;
            this.$$set($$props);
            this.$$.skip_bound = false;
        }
    }
}

/* src/NumberSpinner.svelte generated by Svelte v3.38.2 */

const { document: document_1 } = globals;

function add_css() {
	var style = element("style");
	style.id = "svelte-xg45mw-style";
	style.textContent = ".default.svelte-xg45mw{display:inline-block;box-sizing:border-box;font-variant-numeric:tabular-nums;background-color:white;color:black;width:4em;height:1.6em;margin:0px;padding:0.25em;border:0.075em solid #0004;border-radius:0.15em;text-align:right;vertical-align:baseline;cursor:ew-resize}.default.svelte-xg45mw:focus{border:0.075em solid #06f;outline:none}.default.fast.svelte-xg45mw{border-top-width:0.15em;padding-top:0.175em}.default.slow.svelte-xg45mw{border-bottom-width:0.15em;padding-bottom:0.175em}.default.dragging.svelte-xg45mw{border-color:#04c}.default.editing.svelte-xg45mw{cursor:initial}.drag.svelte-xg45mw{user-select:none}.drag.svelte-xg45mw::selection{background:#0000}.inactive.svelte-xg45mw{display:none !important}";
	append(document_1.head, style);
}

function create_fragment(ctx) {
	let input0;
	let input0_class_value;
	let t;
	let input1;
	let input1_class_value;
	let input1_inputmode_value;
	let mounted;
	let dispose;

	return {
		c() {
			input0 = element("input");
			t = space();
			input1 = element("input");
			attr(input0, "type", "text");
			attr(input0, "style", /*style*/ ctx[10]);
			attr(input0, "class", input0_class_value = "" + (null_to_empty(/*$$props*/ ctx[24].class) + " svelte-xg45mw"));
			input0.readOnly = true;
			attr(input0, "contenteditable", false);
			attr(input0, "tabindex", "0");
			toggle_class(input0, "default", !/*$$props*/ ctx[24].class ? true : false);
			toggle_class(input0, "drag", true);
			toggle_class(input0, "dragging", /*dragging*/ ctx[6]);
			toggle_class(input0, "fast", /*stepFactor*/ ctx[7] > 1 ? "fast" : "");
			toggle_class(input0, "slow", /*stepFactor*/ ctx[7] < 1 ? "slow" : "");
			toggle_class(input0, "focus", /*dragFocussed*/ ctx[4]);
			toggle_class(input0, "inactive", /*editing*/ ctx[8]);
			attr(input1, "style", /*style*/ ctx[10]);
			attr(input1, "class", input1_class_value = "" + (null_to_empty(/*$$props*/ ctx[24].class) + " svelte-xg45mw"));
			attr(input1, "type", "text");

			attr(input1, "inputmode", input1_inputmode_value = isInteger(/*step*/ ctx[1]) && isInteger(/*min*/ ctx[0]) && /*min*/ ctx[0] >= 0
			? "numeric"
			: "text");

			toggle_class(input1, "default", !/*$$props*/ ctx[24].class ? true : false);
			toggle_class(input1, "edit", true);
			toggle_class(input1, "editing", /*editing*/ ctx[8]);
			toggle_class(input1, "focus", /*editFocussed*/ ctx[5]);
			toggle_class(input1, "inactive", !/*editing*/ ctx[8]);
		},
		m(target, anchor) {
			insert(target, input0, anchor);
			/*input0_binding*/ ctx[57](input0);
			set_input_value(input0, /*visibleValue*/ ctx[9]);
			insert(target, t, anchor);
			insert(target, input1, anchor);
			/*input1_binding*/ ctx[59](input1);
			set_input_value(input1, /*visibleValue*/ ctx[9]);

			if (!mounted) {
				dispose = [
					listen(window, "mousemove", function () {
						if (is_function(/*dragging*/ ctx[6] ? /*dragmoveHandler*/ ctx[14] : "")) (/*dragging*/ ctx[6] ? /*dragmoveHandler*/ ctx[14] : "").apply(this, arguments);
					}),
					listen(window, "touchmove", function () {
						if (is_function(/*dragging*/ ctx[6] ? /*touchmoveHandler*/ ctx[13] : "")) (/*dragging*/ ctx[6] ? /*touchmoveHandler*/ ctx[13] : "").apply(this, arguments);
					}),
					listen(window, "mouseup", stop_propagation(function () {
						if (is_function(/*dragging*/ ctx[6]
						? /*mouseupHandler*/ ctx[16]
						: /*editBlurHandler*/ ctx[20])) (/*dragging*/ ctx[6]
						? /*mouseupHandler*/ ctx[16]
						: /*editBlurHandler*/ ctx[20]).apply(this, arguments);
					})),
					listen(window, "touchend", stop_propagation(function () {
						if (is_function(/*dragging*/ ctx[6]
						? /*touchendHandler*/ ctx[15]
						: /*editBlurHandler*/ ctx[20])) (/*dragging*/ ctx[6]
						? /*touchendHandler*/ ctx[15]
						: /*editBlurHandler*/ ctx[20]).apply(this, arguments);
					})),
					listen(window, "keydown", /*keydownHandler*/ ctx[21]),
					listen(window, "keyup", /*keyupHandler*/ ctx[22]),
					listen(input0, "mousedown", stop_propagation(/*dragstartHandler*/ ctx[12])),
					listen(input0, "touchstart", stop_propagation(prevent_default(/*touchstartHandler*/ ctx[11]))),
					listen(input0, "dblclick", stop_propagation(dblclickHandler)),
					listen(input0, "focus", /*dragFocusHandler*/ ctx[17]),
					listen(input0, "blur", /*dragBlurHandler*/ ctx[18]),
					listen(input0, "keydown", /*keydown_handler*/ ctx[54]),
					listen(input0, "keypress", /*keypress_handler*/ ctx[55]),
					listen(input0, "keyup", /*keyup_handler*/ ctx[56]),
					listen(input0, "input", /*input0_input_handler*/ ctx[58]),
					listen(input1, "mouseup", stop_propagation(mouseup_handler)),
					listen(input1, "touchend", stop_propagation(touchend_handler)),
					listen(input1, "focus", /*editFocusHandler*/ ctx[19]),
					listen(input1, "blur", /*editBlurHandler*/ ctx[20]),
					listen(input1, "input", /*inputHandler*/ ctx[23]),
					listen(input1, "keydown", /*keydown_handler_1*/ ctx[51]),
					listen(input1, "keypress", /*keypress_handler_1*/ ctx[52]),
					listen(input1, "keyup", /*keyup_handler_1*/ ctx[53]),
					listen(input1, "input", /*input1_input_handler*/ ctx[60])
				];

				mounted = true;
			}
		},
		p(new_ctx, dirty) {
			ctx = new_ctx;

			if (dirty[0] & /*style*/ 1024) {
				attr(input0, "style", /*style*/ ctx[10]);
			}

			if (dirty[0] & /*$$props*/ 16777216 && input0_class_value !== (input0_class_value = "" + (null_to_empty(/*$$props*/ ctx[24].class) + " svelte-xg45mw"))) {
				attr(input0, "class", input0_class_value);
			}

			if (dirty[0] & /*visibleValue*/ 512 && input0.value !== /*visibleValue*/ ctx[9]) {
				set_input_value(input0, /*visibleValue*/ ctx[9]);
			}

			if (dirty[0] & /*$$props, $$props*/ 16777216) {
				toggle_class(input0, "default", !/*$$props*/ ctx[24].class ? true : false);
			}

			if (dirty[0] & /*$$props*/ 16777216) {
				toggle_class(input0, "drag", true);
			}

			if (dirty[0] & /*$$props, dragging*/ 16777280) {
				toggle_class(input0, "dragging", /*dragging*/ ctx[6]);
			}

			if (dirty[0] & /*$$props, stepFactor*/ 16777344) {
				toggle_class(input0, "fast", /*stepFactor*/ ctx[7] > 1 ? "fast" : "");
			}

			if (dirty[0] & /*$$props, stepFactor*/ 16777344) {
				toggle_class(input0, "slow", /*stepFactor*/ ctx[7] < 1 ? "slow" : "");
			}

			if (dirty[0] & /*$$props, dragFocussed*/ 16777232) {
				toggle_class(input0, "focus", /*dragFocussed*/ ctx[4]);
			}

			if (dirty[0] & /*$$props, editing*/ 16777472) {
				toggle_class(input0, "inactive", /*editing*/ ctx[8]);
			}

			if (dirty[0] & /*style*/ 1024) {
				attr(input1, "style", /*style*/ ctx[10]);
			}

			if (dirty[0] & /*$$props*/ 16777216 && input1_class_value !== (input1_class_value = "" + (null_to_empty(/*$$props*/ ctx[24].class) + " svelte-xg45mw"))) {
				attr(input1, "class", input1_class_value);
			}

			if (dirty[0] & /*step, min*/ 3 && input1_inputmode_value !== (input1_inputmode_value = isInteger(/*step*/ ctx[1]) && isInteger(/*min*/ ctx[0]) && /*min*/ ctx[0] >= 0
			? "numeric"
			: "text")) {
				attr(input1, "inputmode", input1_inputmode_value);
			}

			if (dirty[0] & /*visibleValue*/ 512 && input1.value !== /*visibleValue*/ ctx[9]) {
				set_input_value(input1, /*visibleValue*/ ctx[9]);
			}

			if (dirty[0] & /*$$props, $$props*/ 16777216) {
				toggle_class(input1, "default", !/*$$props*/ ctx[24].class ? true : false);
			}

			if (dirty[0] & /*$$props*/ 16777216) {
				toggle_class(input1, "edit", true);
			}

			if (dirty[0] & /*$$props, editing*/ 16777472) {
				toggle_class(input1, "editing", /*editing*/ ctx[8]);
			}

			if (dirty[0] & /*$$props, editFocussed*/ 16777248) {
				toggle_class(input1, "focus", /*editFocussed*/ ctx[5]);
			}

			if (dirty[0] & /*$$props, editing*/ 16777472) {
				toggle_class(input1, "inactive", !/*editing*/ ctx[8]);
			}
		},
		i: noop,
		o: noop,
		d(detaching) {
			if (detaching) detach(input0);
			/*input0_binding*/ ctx[57](null);
			if (detaching) detach(t);
			if (detaching) detach(input1);
			/*input1_binding*/ ctx[59](null);
			mounted = false;
			run_all(dispose);
		}
	};
}

function dblclickHandler(ev) {
	
} // dispatch("consoleLog", ev.type);
// startEditing();

// Helpers ----------------------------------------------------------
function isInteger(num) {
	return num == Math.round(num);
}

const mouseup_handler = ev => {
	
};

const touchend_handler = ev => {
	
};

function instance($$self, $$props, $$invalidate) {
	const dispatch = createEventDispatcher();
	let { options = {} } = $$props;
	let { value = options.value ?? 0 } = $$props;
	value = parseFloat(value);
	let { min = options.min ?? -1000000000000 } = $$props;
	min = parseFloat(min);
	let { max = options.max ?? 1000000000000 } = $$props;
	max = parseFloat(max);
	let { step = options.step ?? 1 } = $$props;
	step = parseFloat(step);
	let { precision = options.precision ?? step } = $$props;
	precision = parseFloat(precision);
	let { speed = options.speed ?? 1 } = $$props;
	speed = parseFloat(speed);
	let { keyStep = options.keyStep ?? step * 10 } = $$props;
	keyStep = parseFloat(keyStep);
	let { keyStepSlow = options.keyStepSlow ?? step } = $$props;
	keyStepSlow = parseFloat(keyStepSlow);
	let { keyStepFast = options.keyStepFast ?? step * 100 } = $$props;
	keyStepFast = parseFloat(keyStepFast);
	let { decimals = options.decimals ?? 0 } = $$props;
	decimals = parseFloat(decimals);
	let { format = options.format ?? undefined } = $$props;
	let { parse = options.parse ?? undefined } = $$props;
	let { horizontal = options.horizontal ?? true } = $$props;
	let { vertical = options.vertical ?? false } = $$props;
	let { circular = options.circular ?? false } = $$props;
	let { mainStyle = options.mainStyle ?? undefined } = $$props;
	let { fastStyle = options.fastStyle ?? undefined } = $$props;
	let { slowStyle = options.slowStyle ?? undefined } = $$props;
	let { focusStyle = options.focusStyle ?? undefined } = $$props;
	let { draggingStyle = options.draggingStyle ?? undefined } = $$props;
	let { editingStyle = options.editingStyle ?? undefined } = $$props;
	let { cursor = options.cursor ?? undefined } = $$props;
	let preciseValue;
	let visibleValue;
	let tmpValue;
	let isTouchDevice = false;
	let dragElement, editElement;
	let dragFocussed = false;
	let editFocussed = false;
	let focussed = false;
	let dragging = false;
	let wasActiveOnClick, hasMoved, clickX, clickY;
	let stepFactor = 1;
	let altPressed = false;
	let shiftPressed = false;
	let editing = false;
	let style;
	let htmlNode = null;
	let htmlNodeOriginalCursor = null;
	let defaultCursor;

	onMount(() => {
		$$invalidate(48, htmlNode = document.querySelector("html"));
		$$invalidate(49, htmlNodeOriginalCursor = htmlNode.style.cursor);

		return () => {
			$$invalidate(48, htmlNode.style.cursor = htmlNodeOriginalCursor, htmlNode);
		};
	});

	// update all values (preciseValue, visibleValue)
	updateValues(value);

	function touchstartHandler(ev) {
		dispatch("consoleLog", ev.type);
		isTouchDevice = true;
		dragstartHandler(ev);
	}

	function dragstartHandler(ev) {
		dispatch("consoleLog", ev.type);
		wasActiveOnClick = document.activeElement === dragElement;
		$$invalidate(6, dragging = true);
		dragElement.focus();
		hasMoved = false;
		clickX = isTouchDevice ? ev.touches[0].clientX : ev.clientX;
		clickY = isTouchDevice ? ev.touches[0].clientY : ev.clientY;
		$$invalidate(6, dragging = true);
		updateValues(value);
	}

	function touchmoveHandler(ev) {
		// dispatch('consoleLog', ev.type);
		isTouchDevice = true;

		dragmoveHandler(ev);
	}

	function dragmoveHandler(ev) {
		// dispatch('consoleLog', ev.type);
		// ev.preventDefault();
		let actX = isTouchDevice ? ev.touches[0].clientX : ev.clientX;

		let actY = isTouchDevice ? ev.touches[0].clientY : ev.clientY;
		let distX = horizontal ? actX - clickX : 0;
		let distY = vertical ? -(actY - clickY) : 0;
		let stepNum = Math.abs(distX) > Math.abs(distY) ? distX : distY;

		// fire dragstart before value changes
		if (stepNum != 0 && !hasMoved) {
			hasMoved = true;
			dispatch("dragstart");
		}

		stepValue(stepNum * stepFactor);
		clickX = actX;
		clickY = actY;
	} // hasMoved++;

	function touchendHandler(ev) {
		dispatch("consoleLog", ev.type);
		mouseupHandler(ev);
	}

	function mouseupHandler(ev) {
		dispatch("consoleLog", ev.type);

		if (dragging && hasMoved) {
			dispatch("dragend");
		}

		$$invalidate(6, dragging = false);

		// start editing only if element was already focussed on mousedown and no dragging was done
		if (wasActiveOnClick && !hasMoved) {
			startEditing();
		}
	}

	function dragFocusHandler(ev) {
		dispatch("consoleLog", ev.type);
		$$invalidate(4, dragFocussed = true);
		updateFocussed();
	}

	function dragBlurHandler(ev) {
		dispatch("consoleLog", ev.type);
		$$invalidate(4, dragFocussed = false);
		updateFocussed();
	}

	function editFocusHandler(ev) {
		dispatch("consoleLog", ev.type);
		$$invalidate(5, editFocussed = true);
		updateFocussed();
	}

	function editBlurHandler(ev) {
		dispatch("consoleLog", ev.type);
		$$invalidate(5, editFocussed = false);
		updateFocussed();
		stopEditing();
	}

	function keydownHandler(ev) {
		// prevent submitting if the number spinner is inside a form element
		if (ev.key == "Enter" && (ev.target == dragElement || ev.target == editElement)) {
			ev.preventDefault();
		}

		if (ev.target == dragElement || ev.target == editElement) {
			dispatch("consoleLog", ev.type);

			// console.log(ev);
			// necessary for fast typing when starting edit mode
			// otherwise typed keys while tick() in startEditing() would get lost
			if (ev.key.length == 1) {
				tmpValue = tmpValue ? tmpValue + ev.key : ev.key;
			}
		}

		if (ev.key == "Shift") {
			$$invalidate(47, shiftPressed = true);
		}

		if (ev.key == "Alt") {
			$$invalidate(46, altPressed = true);
		}
	}

	function keyupHandler(ev) {
		if (ev.target == dragElement || ev.target == editElement) {
			dispatch("consoleLog", ev.type);
		} // console.log(ev);

		if (ev.key == "Shift") {
			$$invalidate(47, shiftPressed = false);
		}

		if (ev.key == "Alt") {
			$$invalidate(46, altPressed = false);
		}

		if (dragFocussed && !editing) {
			let increment = keyStep;
			if (stepFactor < 1) increment = keyStepSlow;
			if (stepFactor > 1) increment = keyStepFast;

			if (ev.key == "ArrowUp" || ev.key == "ArrowRight") {
				addToValue(increment);
			}

			if (ev.key == "ArrowDown" || ev.key == "ArrowLeft") {
				addToValue(-increment);
			}

			if (ev.key == "Enter") {
				startEditing();
			}

			// also start editing when pressing any non-control keys
			if (ev.key.length == 1) {
				startEditing();
			}
		} else if (editFocussed && editing) {
			if (ev.key == "Enter" || ev.key == "Escape") {
				stopEditing();
			}
		}
	}

	function inputHandler(ev) {
		// dispatch("consoleLog", ev.type);
		// console.log(e);
		let checkValue = parseFloat(editElement.value);

		if (!isNaN(checkValue)) {
			preciseValue = checkValue;
			preciseValue = keepInRange(preciseValue);

			// console.log("dispatch input: ", preciseValue)
			dispatch("input", parseFloat(roundToPrecision(preciseValue)));
		}
	}

	async function updateFocussed() {
		await tick();

		if (document.activeElement == dragElement || document.activeElement == editElement) {
			if (!focussed) {
				focussed = true;
				dispatch("focus");
			} // console.log("Focus");
		} else {
			if (focussed) {
				focussed = false;
				dispatch("blur");
			} // console.log("Blur");
		}
	}

	async function startEditing() {
		$$invalidate(8, editing = true);

		//preciseValue = parseFloat(visibleValue);
		await tick();

		editElement.focus();

		if (tmpValue) {
			$$invalidate(9, visibleValue = tmpValue);
		} else {
			editElement.select();
		}

		dispatch("editstart");
	}

	function stopEditing() {
		if (editing) {
			$$invalidate(8, editing = false);
			tmpValue = undefined;

			if (parse) {
				preciseValue = parse(visibleValue);
				updateValues(preciseValue);
			} else {
				let checkValue = parseFloat(editElement.value);

				if (!isNaN(checkValue)) {
					preciseValue = parseFloat(visibleValue);
					updateValues(preciseValue);
				}
			}

			// Bring focus back to the drag element if editElement was focussed:
			if (document.activeElement === editElement) {
				setTimeout(
					() => {
						dragElement.focus();
					},
					0
				);
			}

			dispatch("editend");
		}
	}

	function stepValue(numSteps) {
		preciseValue = preciseValue ?? parseFloat(visibleValue);
		preciseValue += numSteps * step * speed;
		updateValues(preciseValue);
	}

	function addToValue(increment) {
		preciseValue = preciseValue ?? parseFloat(visibleValue);
		preciseValue += increment;
		updateValues(preciseValue);
	}

	function updateValues(val) {
		preciseValue = parseFloat(val);
		preciseValue = keepInRange(preciseValue);
		$$invalidate(9, visibleValue = Math.round((preciseValue - min) / step) * step + min);

		if (format) {
			$$invalidate(9, visibleValue = format(visibleValue));
		} else {
			$$invalidate(9, visibleValue = visibleValue.toFixed(decimals));
		}

		$$invalidate(25, value = roundToPrecision(preciseValue));
		dispatch("input", parseFloat(value));
		dispatch("change", parseFloat(value));
	}

	function keepInRange(val) {
		$$invalidate(0, min = parseFloat(min));
		$$invalidate(26, max = parseFloat(max));

		if (circular) {
			let range = max - min;
			if (range === 0) return min;
			let fac = val < min ? Math.ceil((min - val) / range) : 0;
			val = (val - min + range * fac) % range + min;
		} else {
			val = Math.min(Math.max(val, min), max);
		}

		return val;
	}

	function roundToPrecision(val) {
		let frac;
		val = Math.round((parseFloat(val) - min) / precision) * precision + min;

		// number of decimals comes either from the precision prop ...
		let dec = precision < 1 ? Math.ceil(-Math.log10(precision)) : 0;

		// ... or from the number of decimals of the step value
		frac = step.toString().split(".")[1];

		if (frac) dec = Math.max(dec, frac.length);

		// ... or from the number of decimals of the min value
		frac = min.toString().split(".")[1];

		if (frac) dec = Math.max(dec, frac.length);
		return parseFloat(val.toFixed(dec));
	}

	function keydown_handler_1(event) {
		bubble($$self, event);
	}

	function keypress_handler_1(event) {
		bubble($$self, event);
	}

	function keyup_handler_1(event) {
		bubble($$self, event);
	}

	function keydown_handler(event) {
		bubble($$self, event);
	}

	function keypress_handler(event) {
		bubble($$self, event);
	}

	function keyup_handler(event) {
		bubble($$self, event);
	}

	function input0_binding($$value) {
		binding_callbacks[$$value ? "unshift" : "push"](() => {
			dragElement = $$value;
			$$invalidate(2, dragElement);
		});
	}

	function input0_input_handler() {
		visibleValue = this.value;
		$$invalidate(9, visibleValue);
	}

	function input1_binding($$value) {
		binding_callbacks[$$value ? "unshift" : "push"](() => {
			editElement = $$value;
			$$invalidate(3, editElement);
		});
	}

	function input1_input_handler() {
		visibleValue = this.value;
		$$invalidate(9, visibleValue);
	}

	$$self.$$set = $$new_props => {
		$$invalidate(24, $$props = assign(assign({}, $$props), exclude_internal_props($$new_props)));
		if ("options" in $$new_props) $$invalidate(33, options = $$new_props.options);
		if ("value" in $$new_props) $$invalidate(25, value = $$new_props.value);
		if ("min" in $$new_props) $$invalidate(0, min = $$new_props.min);
		if ("max" in $$new_props) $$invalidate(26, max = $$new_props.max);
		if ("step" in $$new_props) $$invalidate(1, step = $$new_props.step);
		if ("precision" in $$new_props) $$invalidate(27, precision = $$new_props.precision);
		if ("speed" in $$new_props) $$invalidate(28, speed = $$new_props.speed);
		if ("keyStep" in $$new_props) $$invalidate(29, keyStep = $$new_props.keyStep);
		if ("keyStepSlow" in $$new_props) $$invalidate(30, keyStepSlow = $$new_props.keyStepSlow);
		if ("keyStepFast" in $$new_props) $$invalidate(31, keyStepFast = $$new_props.keyStepFast);
		if ("decimals" in $$new_props) $$invalidate(32, decimals = $$new_props.decimals);
		if ("format" in $$new_props) $$invalidate(34, format = $$new_props.format);
		if ("parse" in $$new_props) $$invalidate(35, parse = $$new_props.parse);
		if ("horizontal" in $$new_props) $$invalidate(36, horizontal = $$new_props.horizontal);
		if ("vertical" in $$new_props) $$invalidate(37, vertical = $$new_props.vertical);
		if ("circular" in $$new_props) $$invalidate(38, circular = $$new_props.circular);
		if ("mainStyle" in $$new_props) $$invalidate(39, mainStyle = $$new_props.mainStyle);
		if ("fastStyle" in $$new_props) $$invalidate(40, fastStyle = $$new_props.fastStyle);
		if ("slowStyle" in $$new_props) $$invalidate(41, slowStyle = $$new_props.slowStyle);
		if ("focusStyle" in $$new_props) $$invalidate(42, focusStyle = $$new_props.focusStyle);
		if ("draggingStyle" in $$new_props) $$invalidate(43, draggingStyle = $$new_props.draggingStyle);
		if ("editingStyle" in $$new_props) $$invalidate(44, editingStyle = $$new_props.editingStyle);
		if ("cursor" in $$new_props) $$invalidate(45, cursor = $$new_props.cursor);
	};

	$$self.$$.update = () => {
		if ($$self.$$.dirty[0] & /*dragElement, editElement*/ 12) {
			// updaters --------------------------------
			// this will init focussed variable
			if (dragElement && editElement) {
				updateFocussed();
			}
		}

		if ($$self.$$.dirty[0] & /*editing, dragging, value*/ 33554752) {
			{
				if (!editing && !dragging) {
					updateValues(value);
				}
			}
		}

		if ($$self.$$.dirty[0] & /*dragFocussed, editing*/ 272 | $$self.$$.dirty[1] & /*altPressed, shiftPressed*/ 98304) {
			{
				$$invalidate(7, stepFactor = 1);

				if (dragFocussed && !editing) {
					if (altPressed && shiftPressed) {
						$$invalidate(7, stepFactor = 10);
					} else if (altPressed) {
						$$invalidate(7, stepFactor = 0.1);
					}
				}
			}
		}

		if ($$self.$$.dirty[0] & /*dragging*/ 64 | $$self.$$.dirty[1] & /*horizontal, vertical, htmlNode, cursor, defaultCursor, htmlNodeOriginalCursor*/ 933984) {
			{
				// let cursorClass = horizontal
				//   ? vertical
				//     ? 'move-cursor'
				//     : 'horizontal-cursor'
				//   : 'vertical-cursor';
				$$invalidate(50, defaultCursor = horizontal
				? vertical ? "move" : "ew-resize"
				: "ns-resize");

				if (htmlNode) {
					if (dragging) {
						$$invalidate(48, htmlNode.style.cursor = cursor ?? defaultCursor, htmlNode);
					} else {
						$$invalidate(48, htmlNode.style.cursor = htmlNodeOriginalCursor, htmlNode); // addClass(htmlNode, cursorClass);
					} // removeClass(htmlNode, cursorClass);
				}
			}
		}

		if ($$self.$$.dirty[0] & /*style, dragFocussed, editFocussed, editing, stepFactor, dragging*/ 1520 | $$self.$$.dirty[1] & /*mainStyle, focusStyle, fastStyle, slowStyle, draggingStyle, editingStyle, cursor, defaultCursor*/ 556800) {
			{
				$$invalidate(10, style = mainStyle ?? "");

				$$invalidate(10, style += (dragFocussed || editFocussed) && focusStyle
				? ";" + focusStyle
				: "");

				$$invalidate(10, style += !editing && stepFactor > 1 && fastStyle
				? ";" + fastStyle
				: "");

				$$invalidate(10, style += !editing && stepFactor < 1 && slowStyle
				? ";" + slowStyle
				: "");

				$$invalidate(10, style += dragging && draggingStyle ? ";" + draggingStyle : "");
				$$invalidate(10, style += editing && editingStyle ? ";" + editingStyle : "");
				$$invalidate(10, style += !editing ? ";cursor:" + (cursor ?? defaultCursor) : "");
			}
		}
	};

	$$props = exclude_internal_props($$props);

	return [
		min,
		step,
		dragElement,
		editElement,
		dragFocussed,
		editFocussed,
		dragging,
		stepFactor,
		editing,
		visibleValue,
		style,
		touchstartHandler,
		dragstartHandler,
		touchmoveHandler,
		dragmoveHandler,
		touchendHandler,
		mouseupHandler,
		dragFocusHandler,
		dragBlurHandler,
		editFocusHandler,
		editBlurHandler,
		keydownHandler,
		keyupHandler,
		inputHandler,
		$$props,
		value,
		max,
		precision,
		speed,
		keyStep,
		keyStepSlow,
		keyStepFast,
		decimals,
		options,
		format,
		parse,
		horizontal,
		vertical,
		circular,
		mainStyle,
		fastStyle,
		slowStyle,
		focusStyle,
		draggingStyle,
		editingStyle,
		cursor,
		altPressed,
		shiftPressed,
		htmlNode,
		htmlNodeOriginalCursor,
		defaultCursor,
		keydown_handler_1,
		keypress_handler_1,
		keyup_handler_1,
		keydown_handler,
		keypress_handler,
		keyup_handler,
		input0_binding,
		input0_input_handler,
		input1_binding,
		input1_input_handler
	];
}

class NumberSpinner extends SvelteComponent {
	constructor(options) {
		super();
		if (!document_1.getElementById("svelte-xg45mw-style")) add_css();

		init(
			this,
			options,
			instance,
			create_fragment,
			safe_not_equal,
			{
				options: 33,
				value: 25,
				min: 0,
				max: 26,
				step: 1,
				precision: 27,
				speed: 28,
				keyStep: 29,
				keyStepSlow: 30,
				keyStepFast: 31,
				decimals: 32,
				format: 34,
				parse: 35,
				horizontal: 36,
				vertical: 37,
				circular: 38,
				mainStyle: 39,
				fastStyle: 40,
				slowStyle: 41,
				focusStyle: 42,
				draggingStyle: 43,
				editingStyle: 44,
				cursor: 45
			},
			[-1, -1, -1]
		);
	}
}

export default NumberSpinner;
