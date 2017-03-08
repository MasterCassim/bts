'use strict';

var cmatch = (function() {

function render_match_table_header(table) {
	const thead = uiu.el(table, 'thead');
	const title_tr = uiu.el(thead, 'tr');
	uiu.el(title_tr, 'th');
	uiu.el(title_tr, 'th', {}, '#');
	uiu.el(title_tr, 'th', {}, 'Spiel');
	uiu.el(title_tr, 'th', {
		colspan: 2,
	}, 'Spieler');
	uiu.el(title_tr, 'th', {}, 'Schiedsrichter');
	uiu.el(title_tr, 'th', {}, 'Stand');
}

function render_match_row(tr, match) {
	const setup = match.setup;
	const actions_td = uiu.el(tr, 'td');
	const edit_btn = uiu.el(actions_td, 'div', {
		'class': 'vlink match_edit_button',
		'data-match__id': match._id,
	});
	edit_btn.addEventListener('click', on_edit_button_click);
	const match_str = (setup.scheduled_time_str ? (setup.scheduled_time_str + ' ') : '') + (setup.match_name ? (setup.match_name + ' ') : '') + setup.event_name;
	uiu.el(tr, 'td', 'match_num', setup.match_num);
	uiu.el(tr, 'td', {}, match_str);
	uiu.el(tr, 'td', {}, calc_players_str(setup, 0));
	uiu.el(tr, 'td', 'match_team2', calc_players_str(setup, 1));
	uiu.el(tr, 'td', (setup.umpire_name ? 'match_umpire' : 'match_no_umpire'), setup.umpire_name || 'Kein Schiedsrichter');
	uiu.el(tr, 'td', {}, 'TODO: match state');
}

function calc_players_str(setup, team_id) {
	const players = setup.teams[team_id].players.map(p => p.name).join(' / ');
	return (
		(setup.incomplete ? '[Unvollständig!] ' : '') +
		(players ? players : '')
	);
}

function prepare_render(t) {
	t.matches.sort(function(m1, m2) {
		return cbts_utils.cmp(m1.setup.match_num, m2.setup.match_num);
	});
}

function on_edit_button_click(e) {
	const btn = e.target;
	const match_id = btn.getAttribute('data-match__id');
	ui_edit(match_id);
}

function _make_setup(d) {
	const is_doubles = !! d.team0player1name;
	const teams = [_make_team(d, 0), _make_team(d, 1)];
	const player_count = is_doubles ? 2 : 1;
	const incomplete = !teams.every(team => (team.players.length === player_count));
	return {
		court_id: d.court_id,
		match_num: parseInt(d.match_num),
		match_name: d.match_name,
		scheduled_time_str: d.scheduled_time_str,
		event_name: d.event_name,
		umpire_name: d.umpire_name,
		teams,
		is_doubles,
		incomplete,
	};
}

function _cancel_ui_edit() {
	const dlg = document.querySelector('.match_edit_dialog');
	if (!dlg) {
		return; // Already cancelled
	}
	uiu.esc_stack_pop();
	uiu.remove(dlg);
	ctournament.ui_show();
}

function ui_edit(match_id) {
	const match = utils.find(curt.matches, m => m._id === match_id);
	if (!match) {
		cerror.silent('Match ' + match_id + ' konnte nicht gefunden werden');
		return;
	}
	crouting.set('t/' + curt.key + '/m/' + match_id + '/edit', {}, _cancel_ui_edit);

	uiu.esc_stack_push(_cancel_ui_edit);

	const body = uiu.qs('body');
	const dialog_bg = uiu.el(body, 'div', 'dialog_bg match_edit_dialog');
	const dialog = uiu.el(dialog_bg, 'div', 'dialog');
	
	uiu.el(dialog, 'h3', {}, 'Match bearbeiten');

	const form = uiu.el(dialog, 'form');
	uiu.el(form, 'input', {
		type: 'hidden',
		name: 'match_id',
		value: match_id,
	});
	const table = uiu.el(form, 'table');
	const tbody = uiu.el(table, 'tbody');
	const trs = render_edit(tbody, match);

	const btn_td = uiu.el(trs[0], 'td', {rowspan: 2});
	const btn = uiu.el(btn_td, 'button', {
		'class': 'match_save_button',
		role: 'submit',
	}, 'Ändern');

	form_utils.onsubmit(form, function(d) {
		const setup = _make_setup(d);
		btn.setAttribute('disabled', 'disabled');
		send({
			type: 'match_edit',
			id: d.match_id,
			setup,
			tournament_key: curt.key,
		}, function match_edit_callback(err) {
			btn.removeAttribute('disabled');
			if (err) {
				return cerror.net(err);
			}
			_cancel_ui_edit();
		});
	});

	const cancel_btn = uiu.el(dialog, 'div', 'match_cancel_link vlink', 'Abbrechen');
	cancel_btn.addEventListener('click', _cancel_ui_edit);	
}
crouting.register(/t\/([a-z0-9]+)\/m\/([-a-zA-Z0-9_]+)\/edit$/, function(m) {
	ctournament.switch_tournament(m[1], function() {
		ui_edit(m[2]);
	});
}, change.default_handler);

function render_match_table(container, matches) {
	const table = uiu.el(container, 'table', 'match_table');
	render_match_table_header(table);
	const tbody = uiu.el(table, 'tbody');

	for (const m of matches) {
		const tr = uiu.el(tbody, 'tr');
		render_match_row(tr, m);
	}
}

function render_unassigned(container) {
	uiu.el(container, 'h3', {}, 'Noch nicht zugewiesene Spiele');

	const unassigned_matches = curt.matches.filter(m => !m.setup.court_id);
	render_match_table(container, unassigned_matches);
}

function render_finished(container) {
	uiu.el(container, 'h3', {}, 'Abgeschlossene Spiele');

	const matches = curt.matches.filter(m => m.finished);
	render_match_table(container, matches);
}

function render_courts(container) {
	const table = uiu.el(container, 'table', 'match_table');
	const tbody = uiu.el(table, 'tbody');
	for (const c of curt.courts) {
		const court_matches = curt.matches.filter(m => (m.setup.court_id === c._id));
		const tr = uiu.el(tbody, 'tr');
		const rowspan = Math.max(1, court_matches.length);
		uiu.el(tr, 'th', {
			'class': 'court_num',
			rowspan,
			title: c._id,
		}, c.num);
		if (court_matches.length === 0) {
			uiu.el(tr, 'td', {colspan: 7}, 'Bisher noch keine Matches auf diesem Court.');
		} else {
			let i = 0;
			for (const cm of court_matches) {
				const my_tr = (i > 0) ? uiu.el(tbody, 'tr') : tr;
				render_match_row(my_tr, cm);
				i++;
			}
		}
	}
}

function _make_player(d, team_idx, player_idx) {
	const name = d['team' + team_idx + 'player' + player_idx + 'name'];
	return name ? {name} : null;
}

function _make_team(d, team_idx) {
	const players = [];
	const p1 = _make_player(d, team_idx, 0);
	if (p1) {
		players.push(p1);
	}
	const p2 = _make_player(d, team_idx, 1);
	if (p2) {
		players.push(p2);
	}
	return {players};
}

function _extract_player_names(setup) {
	const res = {
		team0player0name: '',
		team0player1name: '',
		team1player0name: '',
		team1player1name: '',
	};
	const teams = setup.teams || [];
	teams.forEach(function(team, team_idx) {
		if (!team) return;
		if (!team.players) return;

		team.players.forEach(function(player, player_idx) {
			if (!player) return;
			if (!player.name) return;

			res['team' + team_idx + 'player' + player_idx + 'name'] = player.name;
		});
	});
	return res;
}

function render_edit(tbody, match) {
	const setup = match.setup || {};
	const player_names = _extract_player_names(setup);

	const tr0 = uiu.el(tbody, 'tr');
	const tr1 = uiu.el(tbody, 'tr');

	uiu.el(tr0, 'td', 'match_label', 'Nummer:');
	const num_td = uiu.el(tr0, 'td');
	uiu.el(num_td, 'input', {
		type: 'text',
		name: 'match_num',
		pattern: '^[0-9]+$',
		size: 3,
		required: 'required',
		value: setup.match_num || '',
		tabindex: 1,
	});

	uiu.el(tr1, 'td', 'match_label', 'Zeit:');
	const time_td = uiu.el(tr1, 'td');
	uiu.el(time_td, 'input', {
		type: 'text',
		name: 'scheduled_time_str',
		pattern: '^[0-9]{1,2}:[0-9]{1,2}$',
		title: 'Uhrzeit im 24-Stunden-Format, z.B. 12:34',
		size: 3,
		value: setup.scheduled_time_str || '',
	});

	uiu.el(tr0, 'td', 'match_label', 'Event:');
	const event_td = uiu.el(tr0, 'td');
	uiu.el(event_td, 'input', {
		type: 'text',
		name: 'event_name',
		placeholder: 'z.B. MX O55',
		size: 10,
		value: setup.event_name || '',
	});
	uiu.el(tr1, 'td', 'match_label', 'Match:');
	const match_name_td = uiu.el(tr1, 'td');
	uiu.el(match_name_td, 'input', {
		type: 'text',
		name: 'match_name',
		placeholder: 'z.B. Halbfinale',
		size: 10,
		value: setup.match_name || '',
	});

	const t0p0td = uiu.el(tr0, 'td');
	uiu.el(t0p0td, 'input', {
		type: 'text',
		name: 'team0player0name',
		required: 'required',
		value: player_names.team0player0name,
		tabindex: 2,
	});
	const t0p1td = uiu.el(tr1, 'td');
	uiu.el(t0p1td, 'input', {
		type: 'text',
		name: 'team0player1name',
		placeholder: '(Einzel)',
		value: player_names.team0player1name,
		tabindex: 3,
	});

	uiu.el(tr0, 'td', {
		'class': 'match_label',
		rowspan: 2,
	}, 'vs');

	const t1p0td = uiu.el(tr0, 'td');
	uiu.el(t1p0td, 'input', {
		type: 'text',
		name: 'team1player0name',
		required: 'required',
		value: player_names.team1player0name,
		tabindex: 4,
	});
	const t1p1td = uiu.el(tr1, 'td');
	uiu.el(t1p1td, 'input', {
		type: 'text',
		name: 'team1player1name',
		placeholder: '(Einzel)',
		value: player_names.team1player1name,
		tabindex: 5,
	});

	uiu.el(tr0, 'td', 'match_label', 'Court:');
	const court_td = uiu.el(tr0, 'td');
	const court_select = uiu.el(court_td, 'select', {
		'class': 'court_selector',
		name: 'court_id',
		size: 1,
	});
	uiu.el(court_select, 'option', {
		value: '',
	}, 'Nicht zugewiesen');
	if (curt) {
		for (const court of curt.courts) {
			const attrs = {
				value: court._id,
			};
			if (court._id === setup.court_id) {
				attrs.selected = 'selected';
			}
			uiu.el(court_select, 'option', attrs, court.num);
		}
	}

	uiu.el(tr1, 'td', 'match_label', 'Schiedsrichter:');
	const umpire_td = uiu.el(tr1, 'td');
	uiu.el(umpire_td, 'input', {
		type: 'text',
		name: 'umpire_name',
		size: 15,
		value: setup.umpire_name || '',
	});

	return [tr0, tr1];
}

function render_create(container) {
	uiu.empty(container);
	const form = uiu.el(container, 'form');
	const table = uiu.el(form, 'table');
	const tbody = uiu.el(table, 'tbody');

	const trs = render_edit(tbody, {});

	const btn_td = uiu.el(trs[0], 'td', {rowspan: 2});
	const btn = uiu.el(btn_td, 'button', {
		'class': 'match_save_button',
		role: 'submit',
	}, 'Match hinzufügen');

	form_utils.onsubmit(form, function(d) {
		const setup = _make_setup(d);
		btn.setAttribute('disabled', 'disabled');
		send({
			type: 'match_add',
			setup,
			tournament_key: curt.key,
		}, function(err) {
			btn.removeAttribute('disabled');
			if (err) {
				return cerror.net(err);
			}
			uiu.empty(container);
			render_create(container);
		});
	});
}

return {
	prepare_render,
	render_create,
	render_finished,
	render_unassigned,
	render_courts,
};

})();


/*@DEV*/
if ((typeof module !== 'undefined') && (typeof require !== 'undefined')) {
	var cbts_utils = require('./cbts_utils');
	var cerror = require('../bup/js/cerror');
	var change = require('./change');
	var crouting = require('./crouting');
	var ctournament = require('./ctournament');
	var form_utils = require('../bup/js/form_utils');
	var uiu = require('../bup/js/uiu');
	var utils = require('../bup/js/utils');

    module.exports = cmatch;
}
/*/@DEV*/