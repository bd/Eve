import {Watcher, RawValue, RawEAV, RawEAVC, maybeIntern, ObjectDiffs, createId, asJS} from "./watcher";
import {DOMWatcher, ElemInstance} from "./dom";
import {ID} from "../runtime/runtime";

export interface Instance extends HTMLElement {__element?: RawValue, __styles?: RawValue[], __sort?: RawValue, listeners?: {[event: string]: boolean}}

export class HTMLWatcher extends DOMWatcher<Instance> {
  tagPrefix = "html";

  _checkedRadios:{[name:string]: RawValue, [name:number]: RawValue} = {};

  addExternalRoot(tag:string, element:HTMLElement) {
    let elemId = createId();
    let eavs:RawEAV[] = [
      [elemId, "tag", tag],
      [elemId, "tag", "html/root/external"]
    ];

    this.instances[elemId] = element;
    this._sendEvent(eavs);
  }

  createInstance(id:RawValue, element:RawValue, tagname:RawValue):Instance {
    let elem:Instance
    if(tagname === "svg") elem = document.createElementNS("http://www.w3.org/2000/svg", tagname as string) as any;
    else elem = document.createElement(tagname as string);

    //elem.setAttribute("instance", ""+maybeIntern(id));
    //elem.setAttribute("element", ""+maybeIntern(element));
    elem.__element = element;
    elem.__styles = [];
    return elem;
  }

  getInstance(id:RawValue):Instance|undefined {
    return this.instances[id];
  }

  createRoot(id:RawValue):Instance {
    let elem = this.instances[id];
    if(!elem) throw new Error(`Orphaned instance '${id}'`);
    document.body.appendChild(elem);
    return elem;
  }

  addAttribute(instance:Instance, attribute:RawValue, value:RawValue|boolean):void {
    // @TODO: Error checking to ensure we don't double-set attributes.
    if(attribute == "value") {
      if(instance.classList.contains("html-autosize-input") && instance instanceof HTMLInputElement) {
        instance.size = (instance.value || "").length || 1;
      }
      (instance as HTMLInputElement).value = ""+value;
    } else if(attribute == "tag") {
      if(value === "html/autosize-input" && instance instanceof HTMLInputElement) {
        setImmediate(() => instance.size = (instance.value || "").length || 1);
      } else if(value === "html/trigger/focus" && instance instanceof HTMLInputElement) {
        setImmediate(() => instance.focus());
      } else if(value === "html/trigger/blur" && instance instanceof HTMLInputElement) {
        setImmediate(() => instance.blur());
      } else {
        instance.setAttribute(attribute, ""+value);
      }
    } else if(value === false) {
      instance.removeAttribute(attribute as string);
    } else {
      instance.setAttribute(attribute as string, ""+maybeIntern(value as RawValue));
    }
  }

  removeAttribute(instance:Instance, attribute:RawValue, value:RawValue|boolean):void {
    // @TODO: Error checking to ensure we don't double-remove attributes or remove the wrong value.
    instance.removeAttribute(attribute as string);
    if(attribute === "value") {
      let input = instance as HTMLInputElement;
      if(input.value === value) input.value = "";
    }
  }

  _updateURL(tagname = "url-change") {
    let eventId = createId();
    let eavs:(RawEAV|RawEAVC)[] = [
      [eventId, "tag", "html/event"],
      [eventId, "tag", `html/event/${tagname}`]
    ];

    let hash = window.location.hash.slice(1);
    let ix = 1;
    for(let segment of hash.split("/")) {
      let segmentId = createId();
      eavs.push(
        [eventId, "hash-segment", segmentId],
        [segmentId, "index", ix],
        [segmentId, "value", segment]
      );
      ix += 1;
    }

    this._sendEvent(eavs);
  }

  //------------------------------------------------------------------
  // Event handlers
  //------------------------------------------------------------------

  _mouseEventHandler(tagname:string) {
    return (event:MouseEvent) => {
      let {target} = event;
      if(!this.isInstance(target)) return;

      let eventId = createId();
      let eavs:(RawEAV|RawEAVC)[] = [
        [eventId, "tag", "html/event"],
        [eventId, "tag", `html/event/${tagname}`],
        [eventId, "page-x", event.pageX],
        [eventId, "page-y", event.pageY],
        [eventId, "window-x", event.clientX],
        [eventId, "window-y", event.clientY],

        [eventId, "target", target.__element!]
      ];
      let button = event.button;

      if(button === 0) eavs.push([eventId, "button", "left"]);
      else if(button === 2) eavs.push([eventId, "button", "right"]);
      else if(button === 1) eavs.push([eventId, "button", "middle"]);
      else if(button) eavs.push([eventId, "button", button]);

      let current:Element|null = target;
      let elemIds = [];
      let capturesContextMenu = false;
      while(current && this.isInstance(current)) {
        eavs.push([eventId, "element", current.__element!]);
        if(button === 2 && current.listeners && current.listeners["context-menu"] === true) {
          capturesContextMenu = true;
        }
        current = current.parentElement;
      }
      // @NOTE: You'll get a mousedown but no mouseup for a right click if you don't capture the context menu,
      //   so we throw out the mousedown entirely in that case. :(
      if(button === 2 && !capturesContextMenu) return;
      if(eavs.length) this._sendEvent(eavs);
    };
  }

  _captureContextMenuHandler() {
    return (event:MouseEvent) => {
      let captureContextMenu = false;
      let current:Element|null = event.target as Element;
      while(current && this.isInstance(current)) {
        if(current.listeners && current.listeners["context-menu"] === true) {
          captureContextMenu = true;
        }
        current = current.parentElement;
      }
      if(captureContextMenu && event.button === 2) {
        event.preventDefault();
      }
    };
  }

  _inputEventHandler(tagname:string) {
    return (event:Event) => {
      let target = event.target as (Instance & HTMLInputElement);
      let elementId = target.__element;
      if(elementId) {
        if(target.classList.contains("html-autosize-input")) {
          target.size = target.value.length || 1;
        }
        let eventId = createId();
        let eavs:RawEAV[] = [
          [eventId, "tag", "html/event"],
          [eventId, "tag", `html/event/${tagname}`],
          [eventId, "element", elementId],
          [eventId, "value", target.value]
        ];
        if(eavs.length) this._sendEvent(eavs);
      }
    }
  }

  _changeEventHandler(tagname:string) {
    return (event:Event) => {
      let target = event.target as (Instance & HTMLInputElement);
      if(!(target instanceof HTMLInputElement)) return;
      if(target.type == "checkbox" || target.type == "radio") {
        let elementId = target.__element;
        if(elementId) {
          let eventId = createId();
          let eavs:RawEAV[] = [
            [eventId, "tag", "html/event"],
            [eventId, "tag", `html/event/${tagname}`],
            [eventId, "element", elementId],
            [eventId, "checked", ""+target.checked]
          ];
          let name = target.name;
          if(target.type == "radio" && name !== undefined) {
            let prev = this._checkedRadios[name];
            if(prev && prev !== target.__element) {
              // @NOTE: This is two events in one TX, a bit dangerous.
              let event2Id = createId();
              eavs.push(
                [event2Id, "tag", "html/event"],
                [event2Id, "tag", `html/event/${tagname}`],
                [event2Id, "element", prev],
                [event2Id, "checked", "false"]
              );
            }
            this._checkedRadios[name] = elementId;
          }
          if(eavs.length) this._sendEvent(eavs);
        }
      }
    }
  }

  _keyMap:{[key:number]: string|undefined} = { // Overrides to provide sane names for common control codes.
    9: "tab",
    13: "enter",
    16: "shift",
    17: "control",
    18: "alt",
    27: "escape",
    37: "left",
    38: "up",
    39: "right",
    40: "down",
    91: "meta"
  }

  _keyEventHandler(tagname:string) {
    return (event:KeyboardEvent) => {
      if(event.repeat) return;
      let current:Element|null = event.target as Element;

      let code = event.keyCode;
      let key = this._keyMap[code];

      let eventId = createId();
      let eavs:(RawEAV|RawEAVC)[] = [
        [eventId, "tag", "html/event"],
        [eventId, "tag", `html/event/${tagname}`],
        [eventId, "key-code", code]
      ];
      if(key) eavs.push([eventId, "key", key]);

      while(current && this.isInstance(current)) {
        let elemId = current.__element!;
        eavs.push([eventId, "element", elemId]);
        current = current.parentElement;
      };
      if(eavs.length)this._sendEvent(eavs);
    };
  }

  _focusEventHandler(tagname:string) {
    return (event:FocusEvent) => {
      let target = event.target as (Instance & HTMLInputElement);
      let elementId = target.__element;
      if(elementId) {
        let eventId = createId();
        let eavs:RawEAV[] = [
          [eventId, "tag", "html/event"],
          [eventId, "tag", `html/event/${tagname}`],
          [eventId, "element", elementId]
        ];
        if(target.value !== undefined) eavs.push([eventId, "value", target.value]);
        if(eavs.length) this._sendEvent(eavs);
      }
    }
  }

  _hoverEventHandler(tagname:string) {
    return (event:MouseEvent) => {
      let {target} = event;
      if(!this.isInstance(target)) return;

      let eavs:(RawEAV|RawEAVC)[] = [];
      let elemId = target.__element!;
      if(target.listeners && target.listeners["hover"]) {
        let eventId = createId();
        eavs.push(
          [eventId, "tag", "html/event"],
          [eventId, "tag", `html/event/${tagname}`],
          [eventId, "element", elemId]
        );
      }
      if(eavs.length) this._sendEvent(eavs);
    };
  }

  _hashChangeHandler(tagname:string) {
    return (event:HashChangeEvent) => {
      this._updateURL(tagname);
    };
  }

  //------------------------------------------------------------------
  // Watcher handlers
  //------------------------------------------------------------------

  exportListeners({adds, removes}:ObjectDiffs<{listener:string, elemId:ID, instanceId:RawValue}>) {
    for(let e of Object.keys(adds)) {
      let {listener, elemId, instanceId} = adds[e];
      let instance = this.getInstance(instanceId)!;
      if(!instance.listeners) instance.listeners = {};
      instance.listeners[listener] = true;
    }
    for(let e of Object.keys(removes)) {
      let {listener, elemId, instanceId} = removes[e];
      let instance = this.getInstance(instanceId)
      if(!instance || !instance.listeners) continue;
      instance.listeners[listener] = false;
    }
  }


  //------------------------------------------------------------------
  // Setup
  //------------------------------------------------------------------

  setup() {
    if(typeof window === "undefined") return;
    this.tagPrefix = "html"; // @FIXME: hacky, due to inheritance chain evaluation order.
    super.setup();

    this.program
      .bind("All html elements add their tags as classes", ({find, lib:{string}, record}) => {
        let element = find("html/element");
        element.tag != "html/element"
        let klass = string.replace(element.tag, "/", "-");
        return [
          element.add("class", klass)
        ];
      });

    window.addEventListener("click", this._mouseEventHandler("click"));
    window.addEventListener("dblclick", this._mouseEventHandler("double-click"));
    window.addEventListener("mousedown", this._mouseEventHandler("mouse-down"));
    window.addEventListener("mouseup", this._mouseEventHandler("mouse-up"));
    window.addEventListener("contextmenu", this._captureContextMenuHandler());

    window.addEventListener("input", this._inputEventHandler("change"));
    window.addEventListener("change", this._changeEventHandler("change"));
    window.addEventListener("keydown", this._keyEventHandler("key-down"));
    window.addEventListener("keyup", this._keyEventHandler("key-up"));
    window.addEventListener("focus", this._focusEventHandler("focus"), true);
    window.addEventListener("blur", this._focusEventHandler("blur"), true);

    document.body.addEventListener("mouseenter", this._hoverEventHandler("hover-in"), true);
    document.body.addEventListener("mouseleave", this._hoverEventHandler("hover-out"), true);

    window.addEventListener("hashchange", this._hashChangeHandler("url-change"));

    this.program
      .bind("Elements with no parents are roots.", ({find, record, lib, not}) => {
        let elem = find("html/element");
        not(() => find("html/element", {children: elem}));
        return [
          elem.add("tag", "html/root")
        ];
      })
      .bind("Create an instance for each child of an external root.", ({find, record, lib, not}) => {
        let elem = find("html/element");
        let parent = find("html/root/external", {children: elem});
        return [
          record("html/instance", {element: elem, tagname: elem.tagname, parent}),
          parent.add("tag", "html/element")
        ];
      });

    this.program
      .commit("Remove html events.", ({find, choose}) => {
        let event = find("html/event");
        return [event.remove()];
      })
      .bind("Inputs with an initial but no value use the initial.", ({find, choose}) => {
        let input = find("html/element", {tagname: "input"});
        let [value] = choose(() => input.value, () => input.initial);
        return [input.add("value", value)]
      })
      .commit("Apply input value changes.", ({find}) => {
        let {element, value} = find("html/event/change");
        return [element.remove("value").add("value", value)];
      })
      .commit("Apply input checked changes.", ({find}) => {
        let {element, checked} = find("html/event/change");
        return [element.remove("checked").add("checked", checked)];
      })

      .commit("When an element is entered, mark it hovered.", ({find, record}) => {
        let {element} = find("html/event/hover-in");
        return [element.add("tag", "html/hovered")];
      })
      .commit("When an element is left, clear it's hovered.", ({find, record}) => {
        let {element} = find("html/event/hover-out");
        return [element.remove("tag", "html/hovered")];
      })
      .watch("When an element is hoverable, it subscribes to mouseover/mouseout.", ({find, record}) => {
        let elemId = find("html/listener/hover");
        let instanceId = find("html/instance", {element: elemId});
        return [record({listener: "hover", elemId, instanceId})]
      })
      .asObjects<{listener:string, elemId:ID, instanceId:RawValue}>((diffs) => this.exportListeners(diffs))

      .watch("When an element listeners for context-menu, it prevents default on right click.", ({find, record}) => {
        let elemId = find("html/listener/context-menu");
        let instanceId = find("html/instance", {element: elemId});
        return [record({listener: "context-menu", elemId, instanceId})]
      })
      .asObjects<{listener:string, elemId:ID, instanceId:RawValue}>((diffs) => this.exportListeners(diffs))

      .commit("When the url changes, delete its previous segments.", ({find, record}) => {
        let change = find("html/event/url-change");
        let url = find("html/url");
        return [
          url.remove("hash-segment"),
          url["hash-segment"].remove()
        ];
      })
      .commit("When the url changes, commit its new state.", ({find, lookup, record}) => {
        let change = find("html/event/url-change");
        let {attribute, value} = lookup(change);
        attribute != "tag";
        return [
          record("html/url").add(attribute, value)
        ];
      });

    //setTimeout(() => this._updateURL(), 100);
    this._updateURL()
  }
}

Watcher.register("html", HTMLWatcher);
