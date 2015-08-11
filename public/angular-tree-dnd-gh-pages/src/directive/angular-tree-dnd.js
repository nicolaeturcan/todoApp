angular.module('ntt.TreeDnD')
    .directive(
    'treeDnd', [
        '$injector', '$timeout', '$http', '$compile', '$window', '$document', '$templateCache',
        '$TreeDnDTemplate', '$TreeDnDClass', '$TreeDnDHelper', '$TreeDnDPlugin',
        function ($injector, $timeout, $http, $compile, $window, $document, $templateCache,
                  $TreeDnDTemplate, $TreeDnDClass, $TreeDnDHelper, $TreeDnDPlugin) {
            return {
                restrict:   'E',
                scope:      true,
                replace:    true,
                controller: [
                    '$scope', '$element', '$attrs', function ($scope, $element, $attrs) {
                        $scope.indent = 20;
                        $scope.indent_plus = 15;
                        $scope.indent_unit = 'px';
                        $scope.$tree_class = 'table';
                        $scope.primary_key = '__uid__';


                        $scope.$type = 'TreeDnD';
                        // $scope.enabledFilter = null;
                        $scope.colDefinitions = [];
                        $scope.$globals = {};
                        $scope.$class = {};

                        $scope.treeData = [];
                        $scope.tree_nodes = [];


                        $scope.$class = angular.copy($TreeDnDClass);
                        angular.extend(
                            $scope.$class.icon, {
                                '1':  $attrs.iconExpand || 'glyphicon glyphicon-minus',
                                '0':  $attrs.iconCollapse || 'glyphicon glyphicon-plus',
                                '-1': $attrs.iconLeaf || 'glyphicon glyphicon-file'
                            }
                        );

                        $scope.for_all_descendants = function (node, fn) {
                            if (angular.isFunction(fn)) {
                                var _i, _len, _nodes;

                                if (fn(node)) {
                                    return false;
                                }
                                _nodes = node.__children__;
                                _len = _nodes.length;
                                for (_i = 0; _i < _len; _i++) {
                                    if (!$scope.for_all_descendants(_nodes[_i], fn)) {
                                        return false;
                                    }
                                }
                            }
                            return true;
                        };

                        $scope.getLastDescendant = function (node) {
                            var last_child, n;
                            if (!node) {
                                node = $scope.tree ? $scope.tree.selected_node : false;
                            }
                            if (node === false) {
                                return false;
                            }
                            n = node.__children__.length;
                            if (n === 0) {
                                return node;
                            } else {
                                last_child = node.__children__[n - 1];
                                return $scope.getLastDescendant(last_child);
                            }
                        };

                        $scope.getElementChilds = function () {
                            return angular.element($element[0].querySelector('[tree-dnd-nodes]'));
                        };

                        $scope.onClick = function (node) {
                            if (angular.isDefined($scope.tree) && angular.isFunction($scope.tree.on_click)) {
                                // We want to detach from Angular's digest cycle so we can
                                // independently measure the time for one cycle.
                                setTimeout(
                                    function () {
                                        $scope.tree.on_click(node);
                                    }, 0
                                );
                            }
                        };

                        $scope.onSelect = function (node) {
                            if (angular.isDefined($scope.tree)) {
                                if (node !== $scope.tree.selected_node) {
                                    $scope.tree.select_node(node);
                                }

                                if (angular.isFunction($scope.tree.on_select)) {
                                    setTimeout(
                                        function () {
                                            $scope.tree.on_select(node);
                                        }, 0
                                    );
                                }
                            }
                        };

                        var passedExpand, _clone;
                        $scope.toggleExpand = function (node, fnCallback) {
                            passedExpand = true;
                            if (angular.isFunction(fnCallback) && !fnCallback(node)) {
                                passedExpand = false;
                            } else if (angular.isFunction($scope.$callbacks.expand) && !$scope.$callbacks.expand(node)) {
                                passedExpand = false;
                            }

                            if (passedExpand) {
                                if (node.__children__.length > 0) {
                                    node.__expanded__ = !node.__expanded__;
                                }
                            }
                        };

                        $scope.getHash = function (node) {
                            if ($scope.primary_key === '__uid__') {
                                return '#' + node.__parent__ + '#' + node.__uid__;
                            } else {
                                return '#' + node.__parent__ + '#' + node[$scope.primary_key];
                            }
                        };

                        $scope.$callbacks = {
                            for_all_descendants: $scope.for_all_descendants,
                            expand:              function (node) {
                                return true;
                            },
                            accept:              function (dragInfo, moveTo, isChanged) {
                                return $scope.dropEnabled === true;
                            },
                            calsIndent:          function (level, skipUnit, skipEdge) {
                                var unit = 0,
                                    edge = skipEdge ? 0 : $scope.indent_plus;
                                if (!skipUnit) {
                                    unit = $scope.indent_unit ? $scope.indent_unit : 'px';
                                }

                                if (level - 1 < 1) {
                                    return edge + unit;
                                } else {
                                    return $scope.indent * (level - 1) + edge + unit;
                                }
                            },
                            droppable:           function () {
                                return $scope.dropEnabled === true;
                            },
                            draggable:           function () {
                                return $scope.dragEnabled === true;
                            },
                            beforeDrop:          function (event) {
                                return true;
                            },
                            changeKey:           function (node) {
                                var _key = node.__uid__;
                                node.__uid__ = Math.random();
                                if (node.__selected__) {
                                    delete(node.__selected__);
                                }

                                if ($scope.primary_key !== '__uid__') {
                                    _key = '' + node[$scope.primary_key];
                                    _key = _key.replace(/_#.+$/g, '') + '_#' + node.__uid__;

                                    node[$scope.primary_key] = _key;
                                }
                                // delete(node.__hashKey__);
                            },
                            clone:               function (node, _this) {
                                _clone = angular.copy(node);
                                this.for_all_descendants(_clone, this.changeKey);
                                return _clone;
                            },
                            remove:              function (node, parent, _this) {
                                return parent.splice(node.__index__, 1)[0];
                            },
                            add:                 function (node, pos, parent, _this) {
                                if (parent) {
                                    if (parent.length > -1) {
                                        if (pos > -1) {
                                            parent.splice(pos, 0, node);
                                        } else {
                                            // todo If children need load crazy
                                            parent.push(node);
                                        }
                                    } else {
                                        parent.push(node);
                                    }
                                }
                            }
                        };

                        if ($attrs.enableDrag || $attrs.enableDrop) {
                            $scope.placeElm = null;
                            //                            $scope.dragBorder = 30;
                            $scope.dragEnabled = null;
                            $scope.dropEnabled = null;
                            $scope.horizontal = null;

                            if ($attrs.enableDrag) {

                                $scope.dragDelay = 0;
                                $scope.enabledMove = true;
                                $scope.statusMove = true;
                                $scope.enabledHotkey = false;
                                $scope.enabledCollapse = null;
                                $scope.statusElm = null;
                                $scope.dragging = null;

                                angular.extend(
                                    $scope.$callbacks, {
                                        beforeDrag: function (scopeDrag) {
                                            return true;
                                        },
                                        dragStop:   function (event, skiped) {},
                                        dropped:    function (info, pass, isMove) {
                                            if (!info) {
                                                return null;
                                            }

                                            if (!info.changed && isMove) {
                                                return false;
                                            }
                                            var _node = info.node,
                                                _nodeAdd = null,
                                                _move = info.move,
                                                _parent = null,
                                                _parentRemove = (info.parent || info.drag.treeData),
                                                _parentAdd = (_move.parent || info.target.treeData);

                                            if (info.target.$callbacks.accept(info, info.move, info.changed)) {
                                                if (isMove) {
                                                    _parent = _parentRemove;
                                                    if (angular.isDefined(_parent.__children__)) {
                                                        _parent = _parent.__children__;
                                                    }

                                                    _nodeAdd = info.drag.$callbacks.remove(
                                                        _node,
                                                        _parent,
                                                        info.drag.$callbacks
                                                    );
                                                } else {
                                                    _nodeAdd = info.drag.$callbacks.clone(_node, info.drag.$callbacks);
                                                }

                                                // if node dragging change index in sample node parent
                                                // and index node decrement
                                                if (isMove &&
                                                    info.drag === info.target &&
                                                    _parentRemove === _parentAdd &&
                                                    _move.pos >= info.node.__index__) {
                                                    _move.pos--;
                                                }

                                                _parent = _parentAdd;
                                                if (_parent.__children__) {
                                                    _parent = _parent.__children__;
                                                }

                                                info.target.$callbacks.add(
                                                    _nodeAdd,
                                                    _move.pos,
                                                    _parent,
                                                    info.drag.$callbacks
                                                );

                                                return true;
                                            }

                                            return false;
                                        },
                                        dragStart:  function (event) {},
                                        dragMove:   function (event) {}
                                    }
                                );

                                $scope.setDragging = function (dragInfo) {
                                    $scope.dragging = dragInfo;
                                };

                                $scope.enableMove = function (val) {
                                    if (typeof val === "boolean") {
                                        $scope.enabledMove = val;
                                    } else {
                                        $scope.enabledMove = true;
                                    }
                                };

                                if ($attrs.enableStatus) {
                                    $scope.enabledStatus = false;

                                    $scope.hideStatus = function () {
                                        if ($scope.statusElm) {
                                            $scope.statusElm.addClass($scope.$class.hidden);
                                        }
                                    };

                                    $scope.refreshStatus = function () {
                                        if (!$scope.dragging) {
                                            return;
                                        }

                                        if ($scope.enabledStatus) {
                                            var statusElmOld = $scope.statusElm;
                                            if ($scope.enabledMove) {
                                                $scope.statusElm = angular.element($TreeDnDTemplate.getMove($scope));
                                            } else {
                                                $scope.statusElm = angular.element($TreeDnDTemplate.getCopy($scope));
                                            }

                                            if (statusElmOld !== $scope.statusElm) {
                                                if (statusElmOld) {
                                                    $scope.statusElm.attr('class', statusElmOld.attr('class'));
                                                    $scope.statusElm.attr('style', statusElmOld.attr('style'));
                                                    statusElmOld.remove();
                                                }
                                                $document.find('body').append($scope.statusElm);

                                            }

                                            $scope.statusElm.removeClass($scope.$class.hidden);
                                        }
                                    };

                                    $scope.setPositionStatus = function (e) {
                                        if ($scope.statusElm) {
                                            $scope.statusElm.css(
                                                {
                                                    'left':    e.pageX + 10 + 'px',
                                                    'top':     e.pageY + 15 + 'px',
                                                    'z-index': 9999
                                                }
                                            );
                                            $scope.statusElm.addClass($scope.$class.status);
                                        }
                                    };
                                }
                            }

                            $scope.targeting = false;

                            $scope.getPrevSibling = function (node) {
                                if (node && node.__index__ > 0) {
                                    var _parent, _index = node.__index__ - 1;

                                    if (angular.isDefined(node.__parent_real__)) {
                                        _parent = $scope.tree_nodes[node.__parent_real__];
                                        return _parent.__children__[_index];
                                    }
                                    return $scope.treeData[_index];

                                }
                                return null;
                            };

                            $scope.getNode = function (index) {
                                if (angular.isUndefinedOrNull(index)) {
                                    return null;
                                }
                                return $scope.tree_nodes[index];
                            };

                            $scope.setScope = function (scope, node) {
                                var _hash = $scope.getHash(node);
                                if ($scope.$globals[_hash] !== scope) {
                                    $scope.$globals[_hash] = scope;
                                }
                            };

                            $scope.getScope = function (node) {
                                if (node) {
                                    return $scope.$globals[$scope.getHash(node)];
                                }
                                return $scope;

                            };

                            $scope.initPlace = function (element, dragElm) {

                                var tagName = null,
                                    isTable = false;

                                if (element) {
                                    tagName = element.prop('tagName').toLowerCase();
                                    isTable = (tagName === 'tr' || tagName === 'td');
                                } else {
                                    tagName = $scope.getElementChilds().prop('tagName').toLowerCase();
                                    isTable = (tagName === 'tbody' || tagName === 'table');
                                }

                                if (!$scope.placeElm) {

                                    if (isTable) {
                                        $scope.placeElm = angular.element($window.document.createElement('tr'));
                                        var _len_down = $scope.colDefinitions.length;
                                        $scope.placeElm.append(
                                            angular.element($window.document.createElement('td'))
                                                .addClass($scope.$class.empty)
                                                .addClass('indented')
                                                .addClass($scope.$class.place)
                                        );
                                        while (_len_down-- > 0) {
                                            $scope.placeElm.append(
                                                angular.element($window.document.createElement('td'))
                                                    .addClass($scope.$class.empty)
                                                    .addClass($scope.$class.place)
                                            );
                                        }
                                    } else {
                                        $scope.placeElm = angular.element($window.document.createElement('li'))
                                            .addClass($scope.$class.empty)
                                            .addClass($scope.$class.place);
                                    }

                                }

                                if (dragElm) {
                                    $scope.placeElm.css('height', $TreeDnDHelper.height(dragElm) + 'px');
                                }

                                if (element) {
                                    element[0].parentNode.insertBefore($scope.placeElm[0], element[0]);
                                } else {
                                    $scope.getElementChilds().append($scope.placeElm);
                                }

                                return $scope.placeElm;
                            };

                            $scope.hidePlace = function () {
                                if ($scope.placeElm) {
                                    $scope.placeElm.addClass($scope.$class.hidden);
                                }
                            };

                            $scope.showPlace = function () {
                                if ($scope.placeElm) {
                                    $scope.placeElm.removeClass($scope.$class.hidden);
                                }
                            };

                            $scope.getScopeTree = function () {
                                return $scope;
                            };

                        }

                        $scope.$safeApply = function (fn) {
                            var phase = this.$root.$$phase;
                            if (phase === '$apply' || phase === '$digest') {
                                if (fn && (typeof(fn) === 'function')) {
                                    fn();
                                }
                            } else {
                                this.$apply(fn);
                            }
                        };

                        var getExpandOn = function () {
                                if ($scope.treeData && $scope.treeData.length) {
                                    var _firstNode = $scope.treeData[0], _keys = Object.keys(_firstNode),
                                        _regex = new RegExp("^__([a-zA-Z0-9_\-]*)__$"),
                                        _len,
                                        i;
                                    // Auto get first field with type is string;
                                    for (i = 0, _len = _keys.length; i < _len; i++) {
                                        if (typeof (_firstNode[_keys[i]]) === 'string' && !_regex.test(_keys[i])) {
                                            $scope.expandingProperty = _keys[i];
                                            return;
                                        }
                                    }

                                    // Auto get first
                                    if (angular.isUndefinedOrNull($scope.expandingProperty)) {
                                        $scope.expandingProperty = _keys[0];
                                    }

                                }
                            },
                            getColDefs = function () {
                                // Auto get Defs except attribute __level__ ....
                                if ($scope.treeData.length) {
                                    var _col_defs = [], _firstNode = $scope.treeData[0],
                                        _regex = new RegExp("(^__([a-zA-Z0-9_\-]*)__$|^" + $scope.expandingProperty + "$)"),
                                        _keys = Object.keys(_firstNode),
                                        i, _len;
                                    // Auto get first field with type is string;
                                    for (i = 0, _len = _keys.length; i < _len; i++) {
                                        if (typeof (_firstNode[_keys[i]]) === 'string' && !_regex.test(_keys[i])) {
                                            _col_defs.push(
                                                {
                                                    field: _keys[i]
                                                }
                                            );
                                        }
                                    }
                                    $scope.colDefinitions = _col_defs;
                                }
                            },
                            _fnInitFilter,
                            _fnInitOrderBy,
                            _fnGetControl,
                            do_f = function (root, node, parent, parent_real, level, visible, index) {
                                var _i, _len, _icon, _index_real, _dept, _hashKey;
                                if (!angular.isArray(node.__children__)) {
                                    node.__children__ = [];
                                }

                                node.__parent_real__ = parent_real;
                                node.__parent__ = parent;
                                _len = node.__children__.length;

                                if (angular.isUndefinedOrNull(node.__expanded__) && _len > 0) {
                                    node.__expanded__ = level < $scope.expandLevel;
                                }

                                if (_len === 0) {
                                    _icon = -1;
                                } else {
                                    if (node.__expanded__) {
                                        _icon = 1;
                                    } else {
                                        _icon = 0;
                                    }
                                }
                                // Insert item vertically
                                _index_real = root.length;
                                node.__index__ = index;
                                node.__index_real__ = _index_real;
                                node.__level__ = level;
                                node.__icon__ = _icon;
                                node.__icon_class__ = $scope.$class.icon[_icon];
                                node.__visible__ = !!visible;

                                if (angular.isUndefinedOrNull(node.__uid__)) {
                                    node.__uid__ = "" + Math.random();
                                }

                                root.push(node);

                                // Check node children
                                _dept = 1;
                                if (_len > 0) {
                                    for (_i = 0; _i < _len; _i++) {
                                        _dept += do_f(
                                            root,
                                            node.__children__[_i],
                                            ($scope.primary_key === '__uid__') ? node.__uid__ : node[$scope.primary_key],
                                            _index_real,
                                            level + 1,
                                            visible && node.__expanded__,
                                            _i
                                        );
                                    }
                                }

                                _hashKey = $scope.getHash(node);

                                if (angular.isUndefinedOrNull(node.__hashKey__) || node.__hashKey__ !== _hashKey) {
                                    node.__hashKey__ = _hashKey;
                                    // delete($scope.$globals[_hashKey]);
                                }

                                node.__dept__ = _dept;

                                return _dept;
                            },
                            reload_data = function (oData) {
                                var _data,
                                    _len,
                                    _tree_nodes = [];
                                if (angular.isDefined(oData)) {
                                    if (!angular.isArray(oData) || oData.length === 0) {
                                        return [];
                                    } else {
                                        _data = oData;
                                    }
                                } else if (!angular.isArray($scope.treeData) || $scope.treeData.length === 0) {
                                    return [];
                                } else {
                                    _data = $scope.treeData;
                                }

                                if (!$attrs.expandOn) {
                                    getExpandOn();
                                }

                                if (!$attrs.columnDefs) {
                                    getColDefs();
                                }

                                if (angular.isDefined($scope.orderBy)) {
                                    if (!angular.isFunction(_fnInitOrderBy)) {
                                        _fnInitOrderBy = $TreeDnDPlugin('$TreeDnDOrderBy');
                                    }

                                    if (angular.isFunction(_fnInitOrderBy)) {
                                        _data = _fnInitOrderBy(_data, $scope.orderBy);
                                    }
                                }

                                if (angular.isDefined($scope.filter)) {
                                    if (!angular.isFunction(_fnInitFilter)) {
                                        _fnInitFilter = $TreeDnDPlugin('$TreeDnDFilter');
                                    }

                                    if (angular.isFunction(_fnInitFilter)) {
                                        _data = _fnInitFilter(_data, $scope.filter, $scope.filterOptions);
                                    }
                                }

                                _len = _data.length;
                                if (_len > 0) {
                                    var _i,
                                        _offset, _max, _min, _keys,
                                        _deptTotal = 0;

                                    for (_i = 0; _i < _len; _i++) {
                                        _deptTotal += do_f(_tree_nodes, _data[_i], null, null, 1, true, _i);
                                    }

                                    // clear Element Empty
                                    _keys = Object.keys($scope.$globals);
                                    _len = $scope.$globals.length;
                                    _offset = _len - _deptTotal;

                                    if (_offset !== 0) {
                                        _max = _len - _offset;
                                        _min = _max - Math.abs(_offset);
                                        for (_i = _min; _i < _max; _i++) {
                                            delete($scope.$globals[_keys[_i]]);
                                        }
                                    }
                                }

                                // clear memory
                                if (angular.isDefined($scope.tree_nodes)) {
                                    delete($scope.tree_nodes);
                                }

                                $scope.tree_nodes = _tree_nodes;
                                return _tree_nodes;
                            },
                            _defaultFilterOption = {
                                showParent: true,
                                showChild:  false,
                                beginAnd:   true
                            },
                            tree,
                            check_exist_attr = function (attrs, existAttr, isAnd) {
                                if (angular.isUndefinedOrNull(existAttr)) {
                                    return false;
                                }

                                if (existAttr === '*' || !angular.isUndefined(attrs[existAttr])) {
                                    return true;
                                }

                                if (angular.isArray(existAttr)) {
                                    return for_each_attrs(attrs, existAttr, isAnd);
                                }
                            },
                            for_each_attrs = function (attrs, exist, isAnd) {
                                var i, len = exist.length, passed = false;

                                if (len === 0) {
                                    return null;
                                }
                                for (i = 0; i < len; i++) {
                                    if (check_exist_attr(attrs, exist[i], !isAnd)) {
                                        passed = true;
                                        if (!isAnd) {
                                            return true;
                                        }
                                    } else {
                                        if (isAnd) {
                                            return false;
                                        }
                                    }
                                }

                                return passed;
                            },
                            generateWatch = function (type, nameAttr, valDefault, nameScope, fnNotExist, fnAfter, fnBefore) {
                                nameScope = nameScope || nameAttr;
                                if (typeof type === 'string' || angular.isArray(type)) {
                                    if (angular.isFunction(fnBefore) && fnBefore()) {
                                        return;//jmp
                                    }
                                    if (typeof $attrs[nameAttr] === 'string') {
                                        $scope.$watch(
                                            $attrs[nameAttr], function (val) {
                                                if ((typeof type === 'string' && typeof val === type) ||
                                                    (angular.isArray(type) && type.indexOf(typeof val) > -1)
                                                ) {
                                                    $scope[nameScope] = val;
                                                } else {
                                                    if (angular.isFunction(valDefault)) {
                                                        $scope[nameScope] = valDefault(val);
                                                    } else {
                                                        $scope[nameScope] = valDefault;
                                                    }
                                                }

                                                if (angular.isFunction(fnAfter)) {
                                                    fnAfter($scope[nameScope], $scope);
                                                }
                                            }, true
                                        );
                                    } else {

                                        if (angular.isFunction(fnNotExist)) {
                                            $scope[nameScope] = fnNotExist();
                                        } else if (!angular.isUndefined(fnNotExist)) {
                                            $scope[nameScope] = fnNotExist;
                                        }
                                    }
                                }
                            },
                            _watches = [
                                [
                                    'enableDrag', [
                                    ['boolean', 'enableStatus', null, 'enabledStatus'],
                                    ['boolean', 'enableMove', null, 'enabledMove'],
                                    ['number', 'dragDelay', 0, null, 0],
                                    ['boolean', 'enableCollapse', null, 'enabledCollapse'],
                                    [
                                        'boolean', 'enableHotkey', null, 'enabledHotkey', null, function (isHotkey) {
                                        if (isHotkey) {
                                            $scope.enabledMove = false;
                                        } else {
                                            $scope.enabledMove = $scope.statusMove;
                                        }
                                    }]
                                ]],
                                [
                                    ['enableDrag', 'enableStatus'], [
                                    [
                                        'string', 'templateCopy', $attrs.templateCopy, 'templateCopy', null,
                                        function (_url) {
                                            if (_url && $templateCache.get(_url)) {
                                                $TreeDnDTemplate.setCopy(_url, $scope);
                                            }
                                        }],
                                    [
                                        'string', 'templateMove', $attrs.templateMove, 'templateMove', null,
                                        function (_url) {
                                            if (_url && $templateCache.get(_url)) {
                                                $TreeDnDTemplate.setMove(_url, $scope);
                                            }
                                        }]
                                ]],
                                [
                                    [['enableDrag', 'enableDrop']], [
                                    ['number', 'dragBorder', 30, 'dragBorder', 30]]
                                ],
                                [
                                    '*', [
                                    ['boolean', 'horizontal'],
                                    [
                                        'callback', 'treeClass', function (val) {
                                        switch (typeof val) {
                                            case 'string':
                                                $scope.$tree_class = val;
                                                break;
                                            case 'object':
                                                angular.extend($scope.$class, val);
                                                $scope.$tree_class = $scope.$class.tree;
                                                break;
                                            default:
                                                $scope.$tree_class = $attrs.treeClass;
                                                break;
                                        }
                                    }, 'treeClass', function () {
                                        $scope.$tree_class = $scope.$class.tree + ' table';
                                    }, null, function () {
                                        if (/^(\s+[\w\-]+){2,}$/g.test(" " + $attrs.treeClass)) {
                                            $scope.$tree_class = $attrs.treeClass.trim();
                                            return true;
                                        }
                                    }],
                                    [
                                        ['object', 'string'], 'expandOn', getExpandOn, 'expandingProperty', getExpandOn,
                                        function (expandOn) {
                                            if (angular.isUndefinedOrNull(expandOn)) {
                                                $scope.expandingProperty = $attrs.expandOn;
                                            }
                                        }],
                                    [
                                        'object', 'treeControl', angular.isDefined($scope.tree) ? $scope.tree : {},
                                        'tree', null, function ($tree) {

                                        $scope.reload_data = reload_data;

                                        if (!angular.isFunction(_fnGetControl)) {
                                            _fnGetControl = $TreeDnDPlugin('$TreeDnDControl');
                                        }

                                        if (angular.isFunction(_fnGetControl)) {
                                            tree = angular.extend(
                                                $tree,
                                                _fnGetControl($scope)
                                            );
                                        }
                                    }],
                                    [
                                        ['array', 'object'], 'columnDefs', getColDefs, 'colDefinitions', getColDefs,
                                        function (colDefs) {
                                            if (angular.isUndefinedOrNull(colDefs) || !angular.isArray(colDefs)) {
                                                $scope.colDefinitions = getColDefs();
                                            }
                                        }],
                                    [['object', 'string', 'array', 'function'], 'orderBy', $attrs.orderBy],
                                    [
                                        ['object', 'array'], 'filter', null, 'filter', null, function (filters) {
                                        var _passed = false;
                                        if (angular.isDefined(filters) && !angular.isArray(filters)) {
                                            var _keysF = Object.keys(filters),
                                                _lenF = _keysF.length, _iF;

                                            if (_lenF > 0) {
                                                for (_iF = 0; _iF < _lenF; _iF++) {

                                                    if ((typeof filters[_keysF[_iF]]) === 'string' &&
                                                        filters[_keysF[_iF]].length === 0) {
                                                        continue;
                                                    }
                                                    _passed = true;
                                                    break;
                                                }
                                            }
                                        }

                                        $scope.enabledFilter = _passed;
                                        reload_data();
                                    }],
                                    [
                                        'object', 'filterOptions', _defaultFilterOption, 'filterOptions',
                                        _defaultFilterOption, function (option) {
                                        if (typeof option === "object") {
                                            $scope.filterOptions = angular.extend(_defaultFilterOption, option);
                                        }
                                    }],
                                    ['string', 'primaryKey', $attrs.primaryKey, 'primary_key', '__uid__'],
                                    ['string', 'indentUnit', $attrs.indentUnit, 'indent_unit'],
                                    ['number', 'indent', 30, null, 30],
                                    ['number', 'indentPlus', 20, null, 20],
                                    [
                                        'null', 'callbacks',
                                        function (optCallbacks) {
                                            angular.forEach(
                                                optCallbacks, function (value, key) {
                                                    if (typeof value === "function") {
                                                        if ($scope.$callbacks[key]) {
                                                            $scope.$callbacks[key] = value;
                                                        }
                                                    }
                                                }
                                            );
                                            return $scope.$callbacks;
                                        },
                                        '$callbacks'
                                    ],
                                    [
                                        'number', 'expandLevel', 3, 'expandLevel', 3, function () {
                                        reload_data();
                                    }],
                                    ['boolean', 'enableDrag', null, 'dragEnabled'],
                                    ['boolean', 'enableDrop', null, 'dropEnabled']
                                ]]
                            ],
                            w, lenW = _watches.length,
                            i, len,
                            _curW,
                            _typeW, _nameW, _defaultW, _scopeW, _NotW, _AfterW, _BeforeW;
                        for (w = 0; w < lenW; w++) {
                            // skip if not exist
                            if (!check_exist_attr($attrs, _watches[w][0], true)) {
                                continue;
                            }
                            _curW = _watches[w][1];
                            for (i = 0, len = _curW.length; i < len; i++) {
                                _typeW = _curW[i][0];
                                _nameW = _curW[i][1];
                                _defaultW = _curW[i][2];
                                _scopeW = _curW[i][3];
                                _NotW = _curW[i][4];
                                _AfterW = _curW[i][5];
                                _BeforeW = _curW[i][6];
                                generateWatch(_typeW, _nameW, _defaultW, _scopeW, _NotW, _AfterW, _BeforeW);
                            }
                        }

                        if ($attrs.treeData) {
                            $scope.$watch(
                                $attrs.treeData, function (val) {
                                    $scope.treeData = val;
                                }, true
                            );
                        }

                        $scope.$watch(
                            'treeData', function () {
                                reload_data();
                            }, true
                        );
                    }],
                compile:    function compile(tElement) {

                    var $_Template = '',
                        _element = tElement.html().trim();
                    if (_element.length > 0) {
                        $_Template = _element;
                        tElement.html('');
                    }

                    return function fnPost(scope, element, attrs) {

                        if (attrs.enableDrag) {
                            var _fnInitDrag = $TreeDnDPlugin('$TreeDnDDrag');
                            if (angular.isFunction(_fnInitDrag)) {
                                _fnInitDrag(scope, element, $window, $document);
                            }
                        }

                        // kick out $digest
                        element.ready(function(){
                            // apply Template
                            scope.$safeApply(
                                function () {
                                    if ($_Template.length > 0) {
                                        element.append($compile($_Template)(scope));
                                    } else {
                                        $http.get(
                                            attrs.templateUrl || $TreeDnDTemplate.getPath(),
                                            {cache: $templateCache}
                                        ).success(
                                            function (data) {
                                                element.append($compile(data.trim())(scope));
                                                scope.$element = angular.element(element[0].querySelector('[tree-dnd-nodes]'));
                                            }
                                        );
                                    }

                                }
                            );
                        })
                    };
                }
            };
        }]
);