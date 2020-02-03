import {Watcher, RawMap, RawValue, RawEAV} from "./watcher";
import {v4 as uuid} from "uuid";

export interface Attrs extends RawMap<RawValue|RawValue[]|RawEAV[]> {}

export class UIWatcher extends Watcher {
  protected static _addAttrs(id:string, attrs?: Attrs, eavs:RawEAV[] = []) {
    if(attrs) {
      for(let attr in attrs) {
        if(attrs[attr].constructor !== Array) {
          eavs.push([id, attr, attrs[attr] as RawValue]);

        } else {
          let vals = attrs[attr] as RawValue[] | RawEAV[];
           // We have a nested sub-object (i.e. a set of EAVs).
          if(vals[0].constructor === Array) {
            let childEAVs:RawEAV[] = vals as any;
            let [childId] = childEAVs[0];
            eavs.push([id, attr, childId]);
            for(let childEAV of childEAVs) {
              eavs.push(childEAV);
            }

          } else {
            for(let val of vals as RawValue[]) {
              eavs.push([id, attr, val]);
            }
          }
        }
      }
    }
    return eavs;
  }

  protected static $elem(tag:string, attrs?: Attrs) {
    let id = uuid();
    let eavs:RawEAV[] = [
      [id, "tag", tag],
    ];
    UIWatcher._addAttrs(id, attrs, eavs);
    return eavs;
  }

  protected static _makeContainer(tag:string) {
    function $container(children: RawEAV[][]):RawEAV[];
    function $container(attrs: Attrs, children: RawEAV[][]):RawEAV[];
    function $container(attrsOrChildren?: Attrs|RawEAV[][], maybeChildren?: RawEAV[][]):RawEAV[] {
      let attrs:Attrs|undefined;
      let children:RawEAV[][];
      if(maybeChildren) {
        attrs = attrsOrChildren as Attrs|undefined;
        children = maybeChildren;
      } else {
        children = attrsOrChildren as RawEAV[][];
      }

      let eavs = UIWatcher.$elem(tag, attrs);
      let [id] = eavs[0];
      for(let child of children) {
        let [childId] = child[0];
        eavs.push([id, "children", childId]);
        for(let childEAV of child) {
          eavs.push(childEAV);
        }
      }
      return eavs;
    }
    return $container;
  }

  public static helpers = {
    $style: (attrs?: Attrs) => {
      return UIWatcher._addAttrs(uuid(), attrs);
    },
    $elem: UIWatcher.$elem,

    $text: (text:RawValue, attrs?: Attrs) => {
      let eavs = UIWatcher.$elem("ui/text", attrs);
      let [id] = eavs[0];
      eavs.push([id, "text", text]);
      return eavs;
    },
    $button: (attrs?: Attrs) => {
      return UIWatcher.$elem("ui/button", attrs);
    },
    $row: UIWatcher._makeContainer("ui/row"),
    $column: UIWatcher._makeContainer("ui/column"),
  }

  public helpers = UIWatcher.helpers;

  setup() {
    this.program.attach("html");

    this.program
    // Containers
      .bind("Decorate row elements as html.", ({find, record}) => {
        let elem = find("ui/row");
        return [elem.add("tag", "html/element").add("tagname", "row")];
      })
      .bind("Decorate column elements as html.", ({find, record}) => {
        let elem = find("ui/column");
        return [elem.add("tag", "html/element").add("tagname", "column")];
      })
      .bind("Decorate spacer elements as html.", ({find, record}) => {
        let elem = find("ui/spacer");
        return [elem.add("tag", "html/element").add("tagname", "spacer")];
      })
      .bind("Decorate input elements as html.", ({find, record}) => {
        let elem = find("ui/input");
        return [elem.add("tag", "html/element").add("tagname", "input")];
      })
      .bind("Decorate text elements as html.", ({find, record}) => {
        let elem = find("ui/text");
        return [elem.add("tag", "html/element").add("tagname", "text")];
      })
      .bind("Decorate a elements as html.", ({find, record}) => {
        let elem = find("ui/a");
        return [elem.add("tag", "html/element").add("tagname", "a")];
      })
      .bind("Decorate style elements as html.", ({find, record}) => {
        let elem = find("ui/style");
        return [elem.add("tag", "html/element").add("tagname", "style")];
      })
      .bind("Decorate link elements as html.", ({find, record}) => {
        let elem = find("ui/link");
        return [elem.add("tag", "html/element").add("tagname", "link")];
      })
      .bind("Decorate div elements as html.", ({find, record}) => {
        let elem = find("ui/div");
        return [elem.add("tag", "html/element").add("tagname", "div")];
      })
      .bind("Decorate span elements as html.", ({find, record}) => {
        let elem = find("ui/span");
        return [elem.add("tag", "html/element").add("tagname", "span")];
      })
      .bind("Decorate img elements as html.", ({find, record}) => {
        let elem = find("ui/img");
        return [elem.add("tag", "html/element").add("tagname", "img")];
      })
      .bind("Decorate h1 elements as html.", ({find, record}) => {
        let elem = find("ui/h1");
        return [elem.add("tag", "html/element").add("tagname", "h1")];
      })
      .bind("Decorate h2 elements as html.", ({find, record}) => {
        let elem = find("ui/h2");
        return [elem.add("tag", "html/element").add("tagname", "h2")];
      })
      .bind("Decorate h3 elements as html.", ({find, record}) => {
        let elem = find("ui/h3");
        return [elem.add("tag", "html/element").add("tagname", "h3")];
      })
      .bind("Decorate ul elements as html.", ({find, record}) => {
        let elem = find("ui/ul");
        return [elem.add("tag", "html/element").add("tagname", "ul")];
      })
      .bind("Decorate ol elements as html.", ({find, record}) => {
        let elem = find("ui/ol");
        return [elem.add("tag", "html/element").add("tagname", "ol")];
      })
      .bind("Decorate li elements as html.", ({find, record}) => {
        let elem = find("ui/li");
        return [elem.add("tag", "html/element").add("tagname", "li")];
      });


    // Buttons
    this.program
      .bind("Decorate button elements as html.", ({find, record}) => {
        let elem = find("ui/button");
        return [elem.add("tag", "html/element").add("tagname", "div").add("class", "button")];
      })
      .bind("Decorate button elements with icons.", ({find, record}) => {
        let elem = find("ui/button");
        return [elem.add("class", "iconic").add("class", `ion-${elem.icon}`)];
      });

    //--------------------------------------------------------------------
    // Field Table
    //--------------------------------------------------------------------

    this.program
      .bind("Decorate field tables as html.", ({find, record}) => {
        let elem = find("ui/field-table");
        return [elem.add({tag: "html/element", tagname: "table", cellspacing: 0})];
      })
      .bind("Field tables have a value_row for each AV pair in their fields.", ({find, choose, record}) => {
        let table = find("ui/field-table");
        let {field} = table;
        let {attribute, value} = field;
        let [editable] = choose(() => { field.editable == "value"; return "true"; }, () => "false");
        return [table.add("value_row", [
          record({field, attribute, value})
            .add("editable", editable)
        ])];
      })
      .bind("If a table is editable: all attach each specific editing mode.", ({find, choose}) => {
        let table = find("ui/field-table", "ui/editable");
        return [table.add("editable", [
          // Modify existing
          "value",
          "attribute",
          // Create new,
          "row",
          "field"
        ])];
      })
      .bind("A table's fields inherit the editing mode of their table if they don't specify their own.", ({find, choose}) => {
        let table = find("ui/field-table");
        let {field} = table;
        let [editable] = choose(() => field.editable, () => table.editable);
        return [field.add("editable", editable)];
      })

      .bind("Create a row for each unique field.", ({find, choose, record}) => {
        let table = find("ui/field-table");
        let {field} = table;
        return [
          table.add("children", [
            record("ui/field-table/row", {table, field})
          ])
        ];
      })
      .commit("If a field is row editable, add value_rows for the field when no empty ones exist.", ({find, not, gather, choose, record}) => {
        let table = find("ui/field-table");
        let {field} = table;
        field.editable == "row";
        not(() => find("ui/field-table/cell", {table, field, column: "value", value: ""}))

        let [count] = choose(() => {
          let cell = find("ui/field-table/cell", {field});
          return gather(cell).per(field).count() + 1;
        }, () => 1);

        return [
          table.add("value_row", [
            record("ui/field-table/value-row/new", {sort: `zz${count}`, field, attribute: field.attribute, value: ""})
              .add("editable", "true")
          ])
        ];
      })
      .commit("If a field is row editable, clear any excess empty rows.", ({find, record}) => {
        let table = find("ui/field-table");
        let {field} = table;
        field.editable == "row";
        let cell = find("ui/field-table/cell", {table, field, column: "value", value: ""});
        let other = find("ui/field-table/cell", {table, field, column: "value", value: ""});
        other.sort > cell.sort;
        return [other.value_row.remove()];
      })

      .commit("If a table is field editable, add a field when no empty ones exist.", ({find, not, gather, choose, record}) => {
        let table = find("ui/field-table", {editable: "field"});

        not(() => find("ui/field-table/attribute", {table, column: "attribute", value: ""}))

        let [count] = choose(() => {
          table == find("ui/field-table"); // @FIXME: Hackaround aggregate bug.
          return gather(table.field).per(table).count() + 1;
        }, () => 1);

        return [
          table.add("field", [
            record("ui/field-table/field/new", {sort: `zz${count}`, attribute: "", value: ""})
              .add("editable", table.editable)
              .add("editable", ["attribute", "value"])
          ])
        ];
      })
      .commit("If a table is field editable, clear any excess empty fields.", ({find, lookup, not, choose, record}) => {
        let table = find("ui/field-table", {editable: "field"});
        let table_alias = find("ui/field-table", {editable: "field"});
        table == table_alias;
        // Two new fields exist
        let field = find("ui/field-table/field/new");
        let other_field = find("ui/field-table/field/new");
        // In the same table
        table.field == field;
        table_alias.field == other_field;
        // Both are empty
        not(() => table.change.field == field);
        not(() => table_alias.change.field == other_field);
        // And the other is before this one.
        other_field.sort < field.sort;
        return [field.remove()];
      })

      .bind("Each field row has an attribute and a value set.", ({find, choose, record}) => {
        let field_row = find("ui/field-table/row");
        let {table, field} = field_row;
        let [sort] = choose(() => field.sort, () => field.attribute, () => 1);
        let [editable] = choose(() => { field.editable == "attribute"; return "true" }, () => "false");

        return [
          field_row.add({tag: "html/element", tagname: "tr", sort}).add("children", [
            record("html/element", {sort: 1, tagname: "td", table, field}).add("children", [
              record("ui/field-table/attribute", "ui/field-table/cell", {table, field, value_row: field, column: "attribute"})
                .add("editable", editable)
            ]),
            record("html/element", {sort: 2, tagname: "td", table, field}).add("children", [
              record("ui/field-table/value-set", "ui/column", {table, field})
            ])
          ])
        ];
      })
      .bind("Create a value for each field value in the value set.", ({find, choose, record}) => {
        let value_set = find("ui/field-table/value-set");
        let {table, field} = value_set;
        let {value_row} = table;
        value_row.field == field;
        let {value, editable} = value_row;
        let [sort] = choose(() => value_row.sort, () => value);
        return [
          value_set.add("children", [
            record("ui/field-table/value", "ui/field-table/cell", {sort, table, field, value_row, column: "value", editable}),
          ])
        ];
      })

      .bind("The initial value of a cell is pulled off it's value_row or field.", ({find, choose, not, lookup, record}) => {
        let cell = find("ui/field-table/cell");
        let {field, value_row, column} = cell;
        let {attribute, value:initial} = lookup(value_row);
        attribute == column;
        return [cell.add("initial", initial)]
      })

      .bind("Draw field cells as text if they're not editable.", ({find}) => {
        let cell = find("ui/field-table/cell", {editable: "false"});
        let {field, column, initial} = cell;
        return [cell.add({tag: "ui/text", text: initial})];
      })

      .bind("Draw field cells as inputs when they're editable.", ({find}) => {
        let cell = find("ui/field-table/cell", {editable: "true"});
        let {field, column, initial} = cell;
        return [cell.add({tag: ["ui/input", "html/autosize-input"], placeholder: `${column}...`})];
      })

      .bind("When a cell changes value, update the tables changes list.", ({find, lookup, record}) => {
        let cell = find("ui/field-table/cell");
        let {table, field, column, value, value_row, initial} = cell;
        field.editable == column;
        value != initial;
        return [table.add("change", [
          record("ui/field-change", {field}).add("cell", [
            record({column, initial, value})
          ])
        ])];
      })

    this.autocomplete();
  }

  //--------------------------------------------------------------------
  // Autocomplete
  //--------------------------------------------------------------------

  autocomplete() {
    this.program
      .bind("Decorate autocompletes.", ({find, record}) => {
        let autocomplete = find("ui/autocomplete");
        return [
          autocomplete.add({tag: "ui/column"}).add("children", [
            record("ui/autocomplete/input", "ui/input", {sort: 1, autocomplete})
          ])
        ];
      })
      .bind("Copy input placeholder.", ({find}) => {
        let input = find("ui/autocomplete/input");
        return [input.add({placeholder: input.autocomplete.placeholder})];
      })
      .bind("Copy input initial.", ({find}) => {
        let input = find("ui/autocomplete/input");
        return [input.add({initial: input.autocomplete.initial})];
      })
      .bind("Copy trigger focus.", ({find}) => {
        let autocomplete = find("ui/autocomplete", "html/trigger/focus");
        let input = find("ui/autocomplete/input", {autocomplete});
        return [input.add({tag: "html/trigger/focus"})];
      })
      .bind("Copy autosize input.", ({find}) => {
        let autocomplete = find("ui/autocomplete", "html/autosize-input");
        let input = find("ui/autocomplete/input", {autocomplete});
        return [input.add({tag: "html/autosize-input"})];
      })
      .bind("An autocompletes value is it's input's.", ({find, choose}) => {
        let input = find("ui/autocomplete/input");
        let [value] = choose(() => input.value, () => "");
        return [input.autocomplete.add("value", value)];
      })
      .commit("If an autocomplete's value disagrees with it's selected, clear the selected.", ({find}) => {
        let autocomplete = find("ui/autocomplete");
        let {selected, value} = autocomplete;
        selected.text != value;
        return [autocomplete.remove("selected")];
      })

      .bind("Completions that match the current input value are matches.", ({find, lib:{string}}) => {
        let autocomplete = find("ui/autocomplete");
        let {value, completion} = autocomplete;
        let ix = string["index-of"](string.lowercase(completion.text), string.lowercase(value));
        return [autocomplete.add("match", completion)];
      })

      .bind("Matches are sorted by length.", ({find, lib:{string}}) => {
        let autocomplete = find("ui/autocomplete");
        let {match} = autocomplete;
        let sort = string["codepoint-length"](match.text);
        return [match.add("sort", sort)];
      })

      .bind("Show the matches in a popout beneath the input.", ({find, lookup, record}) => {
        let autocomplete = find("ui/autocomplete");
        let {match} = autocomplete;
        let {attribute, value} = lookup(match);
        attribute != "tag";
        return [
          autocomplete.add("children", [
            record("ui/autocomplete/matches", "ui/column", {sort: 2, autocomplete}).add("children", [
              record("ui/autocomplete/match", "ui/text", {autocomplete, match, sort: match.sort}).add(attribute, value)
            ])
          ])
        ];
      });

    //--------------------------------------------------------------------
    // Autocomplete Interaction
    //--------------------------------------------------------------------

    this.program
      .commit("Clicking a match updates the selected and value of the autocomplete.", ({find, record}) => {
        let ui_match = find("ui/autocomplete/match");
        find("html/event/mouse-down", {element: ui_match});
        let {autocomplete, match} = ui_match;
        return [
          record("ui/event/select", {autocomplete, selected: match}),
        ];
      })
      .commit("Focusing an autocomplete input opens the autocomplete.", ({find, record}) => {
        let input = find("ui/autocomplete/input");
        find("html/event/focus", {element: input});
        return [record("ui/event/open", {autocomplete: input.autocomplete})];
      })
      .commit("Blurring an autocomplete input closes the autocomplete.", ({find, record}) => {
        let input = find("ui/autocomplete/input");
        find("html/event/blur", {element: input});
        return [record("ui/event/close", {autocomplete: input.autocomplete})];
      })

      .commit("If the value matches perfectly on blur, select that match.", ({find, lib:{string}, record}) => {
        let input = find("ui/autocomplete/input");
        let {value} = find("html/event/blur", {element: input});
        let {autocomplete} = input;
        let {match} = autocomplete;
        string.lowercase(match.text) == string.lowercase(value);
        return [record("ui/event/select", {autocomplete, selected: match})];
      })

      .commit("Pressing escape in an open autocomplete closes it.", ({find, not, record}) => {
        let autocomplete = find("ui/autocomplete", {open: "true"});
        find("html/event/key-down", {key: "escape", element: autocomplete});
        return [record("ui/event/close", {autocomplete})];
      })

      .commit("Pressing enter in an open autocomplete submits it.", ({find, record}) => {
        let autocomplete = find("ui/autocomplete", {open: "true"});
        find("html/event/key-down", {key: "enter", element: autocomplete});
        return [
          record("ui/event/submit", {autocomplete}),
          record("ui/event/close", {autocomplete})
        ];
      })
      .commit("Pressing tab in an open autocomplete selects the top match.", ({find, gather, record}) => {
        let autocomplete = find("ui/autocomplete", {open: "true"});
        find("html/event/key-down", {key: "tab", element: autocomplete});
        let {match} = autocomplete;
        1 == gather(match.sort).per(autocomplete).sort();
        return [
          record("ui/event/select", {autocomplete, selected: match}),
          record("ui/event/close", {autocomplete})
        ];
      })

    //--------------------------------------------------------------------
    // Autocomplete Events
    //--------------------------------------------------------------------

    this.program
      .commit("Clear the specified autocomplete.", ({find}) => {
        let event = find("ui/event/clear");
        let {autocomplete} = event;
        let input = find("ui/autocomplete/input", {autocomplete});
        return [
          input.remove("value"),
          event.remove()
        ];
      })
      .commit("When an autocomplete is opened, store it's previous value.", ({find, choose, record}) => {
        let event = find("ui/event/open");
        let {autocomplete} = event;
        let input = find("ui/autocomplete/input", {autocomplete});
        let [value] = choose(() => autocomplete.previous, () => autocomplete.value, () => "");
        return [
          autocomplete.remove("open").add({open: "true", previous: value}),
          input.remove("tag", "html/trigger/blur"),
          event.remove()
        ];
      })
      .commit("When an autocomplete is closed, erase it's previous value.", ({find, choose, record}) => {
        let event = find("ui/event/close");
        let {autocomplete} = event;
        let input = find("ui/autocomplete/input", {autocomplete});
        return [
          autocomplete.remove("open").remove("previous"),
          input.add("tag", "html/trigger/blur"),
          autocomplete.remove("tag", "html/trigger/focus"),
          event.remove()
        ];
      })
      .commit("When an autocomplete is closed, and it's value is changed, emit a change event.", ({find, choose, record}) => {
        let event = find("ui/event/close");
        let {autocomplete} = event;
        autocomplete.value != autocomplete.previous;
        return [
          record("ui/event/change", {autocomplete, value: autocomplete.value})
        ];
      })
      .commit("Selecting a completion updates the autocomplete.", ({find, record}) => {
        let event = find("ui/event/select");
        let {autocomplete, selected} = event;
        let input = find("ui/autocomplete/input", {autocomplete});
        return [
          input.remove("value").add("value", selected.text),
          autocomplete.remove("selected").add("selected", selected),
          event.remove()
        ];
      })
      .commit("When a selection is made and it's different from the previous value, emit a change event.", ({find, record}) => {
        let event = find("ui/event/select");
        let {autocomplete, selected} = event;
        selected.text != autocomplete.previous;
        return [
          record("ui/event/change", {autocomplete, value: selected.text})
        ];
      })
      .commit("Clear the autocomplete change event.", ({find, record}) => {
        let event = find("ui/event/change");
        let {autocomplete} = event;
        return [event.remove()];
      })

  }

}

Watcher.register("ui", UIWatcher);
