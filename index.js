const Field = require("@saltcorn/data/models/field");
const Table = require("@saltcorn/data/models/table");
const Form = require("@saltcorn/data/models/form");
const View = require("@saltcorn/data/models/view");
const Workflow = require("@saltcorn/data/models/workflow");


const {
    text,
    div,
    h3,
    style,
    a,
    script,
    pre,
    domReady,
    i,
} = require("@saltcorn/markup/tags");
const {
  stateFieldsToWhere,
  readState,
} = require("@saltcorn/data//plugin-helper");

const configuration_workflow = () =>
    new Workflow({
        steps: [{
            name: "views",
            form: async(context) => {
                const table = await Table.findOne({ id: context.table_id });
                const fields = await table.getFields();

                const expand_views = await View.find_table_views_where(
                    context.table_id,
                    ({ state_fields, viewtemplate, viewrow }) =>
                    viewrow.name !== context.viewname
                );
                const expand_view_opts = expand_views.map((v) => v.name);

                const create_views = await View.find_table_views_where(
                    context.table_id,
                    ({ state_fields, viewrow }) =>
                    viewrow.name !== context.viewname &&
                    state_fields.every((sf) => !sf.required)
                );
                const create_view_opts = create_views.map((v) => v.name);


                return new Form({
                    fields: [{
                            name: "expand_view",
                            label: "Expand View",
                            sublabel: "Leave blank to have no link to expand view",
                            type: "String",
                            required: false,
                            attributes: {
                                options: expand_view_opts.join(),
                            },
                        },
                        {
                            name: "view_to_create",
                            label: "Use view to create",
                            sublabel: "Leave blank to have no link to create a new item",
                            required: true,
                            type: "String",
                            attributes: {
                                options: create_view_opts.join(),
                            },
                        },
                        {
                          name: "color_field",
                          label: "Color field",
                          type: "String",
                          sublabel: "Field for item's color. Can be value for example: red, blue, grey. Supporting next colors: pink, grey, green, red, orange, magenta, blue, yellow, brown, white.",
                          required: false,
                          attributes: {
                            options: fields
                              .filter((f) => f.type.name === "String")
                              .map((f) => f.name)
                              .join(),
                            },
                        },

                        {
                          name: "group_field",
                          label: "Group field",
                          type: "String",
                          sublabel: "Item group label.",
                          required: true,
                          attributes: {
                            options: fields
                              //.filter((f) => f.type.name === "Integer" || f.type.name === "String")
                              .map((f) => f.name)
                              .join(),
                          },
                        },

                        {
                            name: "title_field",
                            label: "Title field",
                            type: "String",
                            sublabel: "Item name label",
                            required: true,
                            attributes: {
                                options: fields
                                    .filter((f) => f.type.name === "String")
                                    .map((f) => f.name)
                                    .join(),
                            },
                        },
                        {
                            name: "start_field",
                            label: "Start date field",
                            type: "String",
                            sublabel: "The table needs a fields of type 'Date' to item start times.",
                            required: true,
                            attributes: {
                                options: fields
                                    .filter((f) => f.type.name === "Date")
                                    .map((f) => f.name)
                                    .join(),
                            },
                        },
                        {
                            name: "end_field",
                            label: "End date field",
                            type: "String",
                            sublabel: "The table needs a fields of type 'Date' to item end times.",
                            required: true,
                            attributes: {
                                options: fields
                                    .filter((f) => f.type.name === "Date")
                                    .map((f) => f.name)
                                    .join(),
                            },
                        },
                        /*{
                            name: "milestone_field",
                            label: "Milestone field",
                            type: "String",
                            sublabel: "(Under construction) The table can supply a fields of type 'Bool' to mark task as milestone.",
                            required: false,
                            attributes: {
                                options: [
                                    ...fields
                                    .filter((f) => f.type.name === "Bool")
                                    .map((f) => f.name),
                                    "Always",
                                ].join(),
                            },
                        },
                        {
                            name: "progress_field",
                            label: "Progress field",
                            type: "String",
                            sublabel: "A fields of type 'Integer' or 'Float' to denote progress.",
                            required: false,
                            attributes: {
                                options: fields
                                    .filter(
                                        (f) => f.type.name === "Integer" || f.type.name === "Float"
                                    )
                                    .map((f) => f.name)
                                    .join(),
                            },
						},*/	
					    {
                            name: "holidays_data",
                            type: "String",
                            label: "Data for holidays and weekends",
						    sublabel: "Input data for holidays and weekend using format:  ",
                            required: false,
                            input_type: "code",
                            attributes: { mode: "application/javascript" },
                            
                        },
                    ],
                });
            },
        }, ],
    });

const get_state_fields = async(table_id, viewname, { show_view }) => {
    const table_fields = await Field.find({ table_id });
    return table_fields.map((f) => {
        const sf = new Field(f);
        sf.required = false;
        return sf;
    });
};

const run = async(
    table_id,
    viewname, {
        view_to_create,
        expand_view,
	    gantt_view_mode,
        group_field,
        title_field,
        start_field,
        end_field,
		color_field,
        milestone_field,
        progress_field,
		holidays_data,
    },
    state,
    extraArgs
) => {
    const table = await Table.findOne({ id: table_id });
    const fields = await table.getFields();
    readState(state, fields);
    const qstate = await stateFieldsToWhere({ fields, state });
    const rows = await table.getRows(qstate);
	var date = new Date();
    var yyyy = date.getFullYear();
    var firstDay = new Date(date.getFullYear(), date.getMonth()-1, 1);
    var mm = String(firstDay.getMonth() + 1).padStart(2, '0');
    var dd = String(firstDay.getDate()).padStart(2, '0');
    const startday = yyyy + "-"+ mm + "-" + dd;
    var lastDay = new Date(date.getFullYear(), date.getMonth() + 2, 0);
    var mm = String(lastDay.getMonth() + 1).padStart(2, '0');
    var dd = String(lastDay.getDate()).padStart(2, '0');
    const endday = yyyy + "-" + mm + "-" + dd;
	
    const tasks = rows.map((row) => {
    const content = row[title_field];
	const start = new Date(row[start_field]).toISOString();
	const end = new Date(row[end_field]).toISOString();
	const className = row[color_field];
	const id = row.id;
	const group = row[group_field];	
	return {content , start, end, group, id, className };
    });
	
	const group_field_field = fields.find((f) => f.name === group_field);
	if (group_field_field.type === "Key") {
		
	var reftable = await Table.findOne({name: group_field_field.reftable_name});
	var refrows = await reftable.getRows();
	var groups_data = refrows.map((row) => {
    var content = row[group_field_field.attributes.summary_field];
	var id = row.id;
	return {content ,  id };
    });
	}
	else {
	var groups_data = rows.map((row) => {
    var content = row[group_field];
	var id = row[group_field];
	return {content ,  id };
    });
	};
	groups_data = groups_data.filter((elem, index, self) => self.findIndex(
    (t) => {return (t.id === elem.id && t.content === elem.content)}) === index);

    return div(
        div(    {
      id : "visualization",
      //class: "gantt-target",
    }
	
),
	style (`
	.vis-item {
  border-width: 1px;
  font-size: 8pt;
  font-weight: bold;
 }
 
 .vis-timeline {
  font-size: 8pt;
}

.vis-item.vis-background.negative {
  background-color: rgba(255, 0, 0, 0.2);
}
 
 .vis-item.vis-selected {
  background-color: grey;
  border-width: 2px;
  box-shadow: 0 0 10px grey;
}

	.vis-item.green {
  background-color: greenyellow;
}

.vis-item.red {
  background-color: coral;
}

.vis-item.orange {
  background-color: gold;
}

.vis-item.magenta {
  background-color: magenta;
}

.vis-item.blue {
  background-color: cyan;
}

.vis-item.yellow {
  background-color: yellow;
}

.vis-item.pink {
  background-color: pink;
}

.vis-item.brown {
  background-color: brown;
}

.vis-item.grey {
  background-color: grey;
}

.vis-item.white {
  background-color: white;
}`
), 
        script(
            domReady(`
  var container = document.getElementById("visualization");
  
  let items=${JSON.stringify(tasks)};
  let data=[];
  ${holidays_data}; 
  var holidays=[];
  data.forEach(function(a, i, data) {
  holidays.push({"id":("holiday "+i.toString()),"start":(a+" 00:00:00"), "end":(a+" 23:59:59"), "type": "background",
    "className": "negative" });});
  var groups = ${JSON.stringify(groups_data)};
  // определяем пустые значения end 
  items.forEach( function (item, i, items) {
  if (item.end===null || item.end === "" || item.end === 'undefined' || item.end === "1970-01-01T00:00:00.000Z")
	  {items[i]=({"id":item.id,"group":item.group, "start":item.start,  "content":item.content, "className":item.className});}
  });
  items = [...items, ...holidays];
  var options = {
  editable: {
    add: true,         // add new items by double tapping
    updateTime: true,  // drag items horizontally
    updateGroup: true, // drag items from one group to another
    remove: true,       // delete an item by tapping the delete button top right
    overrideItems: true  // allow these options to override item.editable
  },
  orientation :{axis : 'top',
               item: 'top'},
  //clickToUse : true,
  horizontalScroll: true,
  //groupEditable : true,
  timeAxis: {scale: 'weekday', step: 1},
  onUpdate: function (item) {
  javascript:ajax_modal ('/view/${expand_view}?id=' + item.id);
  },
 onAdd: function (item) {  
 javascript:ajax_modal ('/view/${view_to_create}?${group_field}=' + item.group + '&${start_field}=' + item.start+ '&${end_field}=' + item.end);
 },
 onMove : function (item) {
 view_post('${viewname}', 'set_new_values', item);
 },
onRemove: function (item, callback) {
    result = confirm('Действительно удалить?');
    if (result == true) {
      view_post('${viewname}', 'delete_values', item);
	  callback(item);
    }
    else {
      callback(null); // cancel updating the item
    }
  
  },
  start: '${startday}',
  end: '${endday}',
 //height: "500px",
 //min: new Date(2012, 0, 1), // lower limit of visible range
  //max: new Date(2013, 0, 1), // upper limit of visible range
  zoomMin: 1000 * 60 * 60 * 24*7, // one day in milliseconds
  zoomMax: 1000 * 60 * 60 * 24 * 31 * 1, // about three months in milliseconds
};
  

// Create a Timeline

var timeline = new vis.Timeline(container);
timeline.setOptions(options);
timeline.setGroups(groups);
timeline.setItems(items);
  
  
`)
        )
    );
};

const set_new_values = async (
  table_id,
  viewname,
  { start_field, end_field, group_field },
  body,
  { req }
) => {
  const table = await Table.findOne({ id: table_id });
  
  const role = req.isAuthenticated() ? req.user.role_id : 10;
  if (role > table.min_role_write) {
    return { json: { error: "not authorized" } };
  } 
  const newbody = {};
  newbody[start_field] = body.start;
  newbody[end_field] = body.end;
  newbody[group_field] = body.group;
  await table.updateRow(newbody, parseInt(body.id));
  return { json: { success: "ok" } };
};

const delete_values = async (
  table_id,
  viewname,
  { start_field, end_field, group_field },
  body,
  { req }
) => {
  const table = await Table.findOne({ id: table_id });
  
  const role = req.isAuthenticated() ? req.user.role_id : 10;
  if (role > table.min_role_write) {
    return { json: { error: "not authorized" } };
  } 
  const newbody = {};
  newbody[start_field] = body.start;
  newbody[end_field] = body.end;
  newbody[group_field] = body.group;
  await table.deleteRows({id:parseInt(body.id)});
  
  return { json: { success: "ok" } };
  
};


const headers = [{
        script: "https://xinonix.ru/files/serve/12",
    },
    {
        css: "https://unpkg.com/vis-timeline@latest/styles/vis-timeline-graph2d.min.css",
    },
];

module.exports = {
    sc_plugin_api_version: 1,
    headers,
    viewtemplates: [{
        name: "timeline",
        display_state_form: false,
        get_state_fields,
        configuration_workflow,
        run,
		routes: { set_new_values, delete_values },
    }, ],
};
