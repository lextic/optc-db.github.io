(function() {

var directives = { };
var filters = { };

var app = angular.module('optc');

/**************
 * Directives *
 **************/

directives.characterTable = function($rootScope, $compile) {
    return {
        restrict: 'E',
        replace: true,
        template: '<table id="mainTable" class="table table-striped-column panel panel-default"></table>',
        link: function(scope, element, attrs) {
            var table = element.dataTable({
                iDisplayLength: JSON.parse(localStorage.getItem('unitsPerPage')) || 10,
                stateSave: true,
                data: scope.table.data,
                columns: scope.table.columns,
                rowCallback: function(row, data, index) {
                    if (row.hasAttribute('loaded')) return;
                    // lazy thumbnails
                    $(row).find('[data-original]').each(function(n,x) {
                        x.setAttribute('src',x.getAttribute('data-original'));
                        x.removeAttribute('data-original');
                    });
                    // character log checkbox
                    var id = data[data.length - 1] + 1;
                    var checkbox = $('<label><input type="checkbox" ng-change="checkLog(' + id + ')" ng-model="characterLog[' + id + ']"></input></label>');
                    $(row.cells[10 + scope.table.additional]).append(checkbox);
                    // compile
                    $compile($(row).contents())($rootScope);
                    if (window.units[id - 1].incomplete) $(row).addClass('incomplete');
                    row.setAttribute('loaded','true');
                },
                headerCallback : function(header) {
                    if (header.hasAttribute('loaded')) return;
                    header.cells[header.cells.length - 1].setAttribute('title', 'Character Log');
                    header.setAttribute('loaded',true);
                }
            });
            scope.table.refresh = function() { element.fnDraw(); };
            // report link
            var link = $('<span class="help-link">Want to report or request something? Use <a>this form</a>.</span>');
            link.find('a').attr('href', 'https://docs.google.com/forms/d/1jSlwN0Ruyc5bFfxdXlwihqfLdCiELX7HQTabXoCV7hU/viewform?usp=send_form');
            link.insertAfter($('.dataTables_length'));
            // pick column link
            var pick = $('<a id="pick-link" popover-placement="bottom" popover-trigger="click" popover-title="Additional Columns" ' +
                'popover-template="\'views/pick.html\'" popover-append-to-body="\'true\'">Additional columns</a>');
            $compile(pick)(scope);
            pick.insertAfter($('.dataTables_length'));
            // fuzzy toggle
            var fuzzyToggle = $('<label class="fuzzy-toggle"><input type="checkbox">Enable fuzzy search</input></label>');
            fuzzyToggle.attr('title','When enabled, searches will also display units whose name is not an exact match to the search keywords.\nUseful if you don\'t know the correct spelling of a certain unit.');
            fuzzyToggle.find('input').prop('checked', scope.table.fuzzy);
            fuzzyToggle.find('input').change(function() {
                scope.table.fuzzy = $(this).is(':checked');
                localStorage.setItem('fuzzy', JSON.stringify(scope.table.fuzzy));
                scope.table.refresh();
            });
            fuzzyToggle.insertBefore($('.dataTables_length'));
        }
    };
};

directives.decorateSlot = function() {
    return {
        restrict: 'A',
        scope: { uid: '=', big: '@' },
        link: function(scope, element, attrs) {
            if (scope.big)
                element[0].style.backgroundImage = 'url(' + Utils.getBigThumbnailUrl(scope.uid) + ')';
            else
                element[0].style.backgroundImage = 'url(' + Utils.getThumbnailUrl(scope.uid) + ')';
        }
    };
};

directives.autoFocus = function($timeout) {
	return {
		restrict: 'A',
		link: function(scope, element, attrs) {
			$timeout(function(){ element[0].focus(); });
		}
	};
};

directives.addOrbOptions = function($timeout, $compile) {
    var TARGET = 25;
    return {
        restrict: 'A',
        link: function(scope,element,attrs) {
            if (scope.n !== TARGET) return;
            var filter = $('<span class="custom filter" id="controllers" ' +
                'ng-show="filters.custom[' + TARGET + ']"><span class="separator">&darr;</span></span>');
            var separator = filter.find('.separator');
            [ 'STR', 'DEX', 'QCK', 'PSY', 'INT', 'RCV', 'TND' ].forEach(function(type) {
                var template = '<span class="filter orb %s" ng-class="{ active: filters.%f == \'%s\' }" ' +
                    'ng-model="filters.%f" ng-click="onFilterClick($event,\'%s\')">%S</span>';
                separator.before($(template.replace(/%s/g,type).replace(/%S/g,type[0]).replace(/%f/g,'ctrlFrom')));
                filter.append($(template.replace(/%s/g,type).replace(/%S/g,type[0]).replace(/%f/g,'ctrlTo')));
            });
            element.after(filter);
            $compile(filter)(scope);
        }
    };
};

directives.goBack = function($state) {
	return {
		restrict: 'A',
        link: function(scope, element, attrs) {
            element.click(function(e) {
                if (!e.target || e.target.className.indexOf('inner-container') == -1) return;
                $state.go('^');
            });
        }
    };
};

directives.evolution = function($state, $stateParams) {
    return {
        restrict: 'E',
        replace: true,
        scope: { unit: '=', base: '=', evolvers: '=', evolution: '=', size: '@' },
        templateUrl: 'views/evolution.html',
        link: function(scope, element, attrs) {
            scope.goToState = function(id) {
                if (id == parseInt($stateParams.id,10)) return;
                var previous = $stateParams.previous.concat([ $stateParams.id ]);
                $state.go('main.view',{ id: id, previous: previous });
            };
        }
    };
};

directives.unit = function($state, $stateParams) {
    return {
        restrict: 'E',
        scope: { uid: '=' },
        template: '<a class="slot medium" decorate-slot uid="uid" ng-click="goToState(uid)"></a>',
        link: function(scope, element, attrs) {
            scope.goToState = function(id) {
                if (id == parseInt($stateParams.id,10)) return;
                var previous = $stateParams.previous.concat([ $stateParams.id ]);
                $state.go('main.view',{ id: id, previous: previous });
            };
        }
    };

};

directives.compare = function() {
    var fuse = new Fuse(window.units, { keys: [ 'name' ], id: 'number' });
    return {
        restrict: 'A',
        link: function(scope, element, attrs) {

            var target = element.typeahead(
                { minLength: 3, highlight: true },
                {
                    source: function(query, callback) { callback(fuse.search(query)); },
                    templates: {
                        suggestion: function(id) {
                            var name = units[id].name, url = Utils.getThumbnailUrl(id+1);
                            if (name.length > 63) name = name.slice(0,60) + '...';
                            var thumb = '<div class="slot small" style="background-image: url(' + url + ')"></div>';
                            return '<div><div class="suggestion-container">' + thumb + '<span>' + name + '</span></div></div>';
                        }
                    },
                    display: function(id) {
                        return units[id].name;
                    }
                }
            );

            target.bind('typeahead:select',function(e,suggestion) {
                $(e.currentTarget).prop('disabled', true);
                scope.compare = window.units[suggestion];
                scope.compareDetails = window.details[suggestion + 1];
                if (!scope.$$phase) scope.$apply();
            });

            element[0].style.backgroundColor = null;

        }
    };
};

directives.comparison = function() {
    return {
        restrict: 'A',
        link: function(scope, element, attrs) {
            var positive = (attrs.comparison == 'positive');
            var watch = scope.$watch(
                function() { return element.html(); },
                function() {
                    var isNegative = parseFloat(element.text(),10) < 0;
                    element.removeClass('positive negative withPlus');
                    if ((positive && !isNegative) || (!positive && isNegative)) element.addClass('positive');
                    else element.addClass('negative');
                    if (!isNegative) element.addClass('withPlus');
                }
            );
            scope.$on('$destroy',watch);
        }
    };
};

directives.addTags = function($stateParams, $rootScope, utils) {
    return {
        restrict: 'E',
        replace: true,
        template: '<div class="tag-container"></div>',
        link: function(scope, element, attrs) {
            var id = $stateParams.id, data = details[id];
            if (!scope.reverseDropMap) utils.generateReverseDropMap($rootScope);
            // flags
            var flags = data.flags || { };
            element.append($('<span class="tag flag">' + (flags.global ? 'Global' : 'JP only') + '</div>'));
            element.append($('<span class="tag flag">' +
                        (scope.reverseDropMap.hasOwnProperty(id) ? 'Farmable' : 'Non-farmable') + '</div>'));
            if (flags.rr) element.append($('<span class="tag flag">Rare Recruit only</div>'));
            if (flags.lrr) element.append($('<span class="tag flag">Limited Rare Recruit only</div>'));
            if (flags.promo) element.append($('<span class="tag flag">Promo-code only</div>'));
            if (flags.special) element.append($('<span class="tag flag">One time only characters</div>'));
            if (flags.raid) element.append($('<span class="tag flag">Raid only</div>'));
            if (flags.fnonly) element.append($('<span class="tag flag">Fortnight only</div>'));
            // matchers
            matchers.forEach(function(matcher) {
                var name;
                // captain effects
                if (matcher.target == 'captain' && matcher.matcher.test(data.captain)) {
                    name = matcher.name;
                    if (!/captains$/.test(name)) name = name.replace(/ers$/,'ing').replace(/s$/,'') + ' captain';
                    else name = name.replace(/s$/,'');
                    element.append($('<span class="tag captain">' + name + '</div>'));
                }
                // specials
                if (matcher.target == 'special' && matcher.matcher.test(data.special)) {
                    name = matcher.name;
                    if (!/specials$/.test(name)) name = name.replace(/ers$/,'ing').replace(/s$/,'') + ' special';
                    else name = name.replace(/s$/,'');
                    element.append($('<span class="tag special">' + name + '</div>'));
                }
            });
        }
    };
};

directives.addLinks = function($stateParams) {
    return {
        restrict: 'E',
        replace: true,
        template: '<div class="link-container"></div>',
        link: function(scope, element, attrs) {
            var id = parseInt($stateParams.id,10), data = details[id], incomplete = units[id - 1].incomplete;
            var ul = $('<ul></ul>');
            if (!incomplete && data.flags && data.flags.global) {
                var link = 'http://onepiece-treasurecruise.com/en/' + (id == '5' ? 'roronoa-zoro' : 'c-' + id);
                ul.append($('<li><a href="' + link + '" target="_blank">Official Guide (English)</a></li>'));
            }
            if (!incomplete) {
                ul.append($('<li><a href="http://onepiece-treasurecruise.com/c-' + id + '" target="_blank">' +
                        'Official Guide (Japanese)</a></li>'));
            }
            if (!isNaN(gw[id-1])) {
                ul.append($('<li><a href="http://xn--pck6bvfc.gamewith.jp/article/show/' + gw[id-1] + '" target="_blank">' +
                        'GameWith Page (Japanese)</a></li>'));
            }
            if (ul.children().length > 0)
                element.append(ul);
        }
    };
};

directives.linkButton = function() {
    return {
        restrict: 'E',
        replace: true,
        templateUrl: '../common/links.html',
        scope: { exclude: '@' },
        link: function(scope, element, attrs) {
            element.find(".trigger").click(function() {
                $(".menu").toggleClass("active"); 
            });
        }
    };
};

/***********
 * Filters *
 ***********/

filters.decorate = function() {
    return function(input) {
        if (!input) return 'None';
        return input
            .replace(/\[?(STR|DEX|QCK|PSY|INT|TND)\]?/g,'<span class="mini-type $1">$1</span>')
            .replace(/\[RCV\]/g,'<span class="mini-type RCV">RCV</span>');

    };
};

/******************
 * Initialization *
 ******************/

for (var directive in directives)
    app.directive(directive, directives[directive]);

for (var filter in filters)
    app.filter(filter, filters[filter]);

})();
