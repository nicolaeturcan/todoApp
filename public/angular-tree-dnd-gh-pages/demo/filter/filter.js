(function () {
    'use strict';
    app.controller(
        'FilterController', [
            '$scope', '$TreeDnDConvert', '$http', function ($scope, $TreeDnDConvert, $http) {
                var tree = {};
                $scope.tree_data = {};
                $scope.my_tree = tree = {};

                $scope._filter = {};
                $scope.expanding_property = {
                    /*template: "<td>OK All</td>",*/
                    field:       "Name",
                    titleClass:  'text-center',
                    cellClass:   'v-middle',
                    displayName: 'Name'
                };

                $scope.col_defs = [
                    {
                        field: "Description"
                    },
                    {
                        field: "Area"
                    },
                    {
                        field: "Population"
                    }, {
                        titleStyle:    {
                            'width': '80pt'
                        },
                        titleClass:    'text-center',
                        cellClass:     'v-middle text-center',
                        displayName:   'Function',
                        cellTemplate:  '<button ng-click="tree.remove_node(node)" class="btn btn-default btn-sm">Remove</button>'
                    }];

                $scope.expanding_property_inside = {
                    /*template: "<td>OK All</td>",*/
                    field:       "Name",
                    titleClass:  'text-center',
                    titleTemplate: '<label> {{expandingProperty.displayName || expandingProperty.field || expandingProperty}} <input class="form-control" ng-model="_filter.Name"></label>',
                    cellClass:   'v-middle',
                    displayName: 'Name'
                };
                $scope.col_defs_inside = [
                    {
                        field:         "Description",
                        titleClass:  'text-center',
                        titleTemplate: '<label> {{col.displayName || col.field}} <input class="form-control" ng-model="_filter.Description"></label>'
                    },
                    {
                        field:         "Area",
                        titleClass:  'text-center',
                        titleTemplate: '<label> {{col.displayName || col.field}} <input class="form-control" ng-model="_filter.Area"></label>'
                    },
                    {
                        field:         "Population",
                        titleClass:  'text-center',
                        titleTemplate: '<label> {{col.displayName || col.field}} <input class="form-control" ng-model="_filter.Population"></label>'
                    }, {
                        titleStyle:    {
                            'width': '80pt'
                        },
                        titleClass:    'text-center',
                        titleTemplate: '<label> {{col.displayName || col.field}} <input class="form-control" ng-model="_filter.Description"></label>',
                        cellClass:     'v-middle text-center',
                        displayName:   'Function',
                        cellTemplate:  '<button ng-click="tree.remove_node(node)" class="btn btn-default btn-sm">Remove</button>'
                    }];

                // DataDemo.getDatas() can see in 'Custom Option' -> Tab 'Data Demo'
                //$scope.tree_data = $TreeDnDConvert.line2tree(DataDemo.getDatas(), 'DemographicId', 'ParentId');
                $http.get('http://privacydriver.app/regulations?api=1').
                    success(function (data) {
                        // this callback will be called asynchronously
                        // when the response is available
                        $scope.tree_data = $TreeDnDConvert.line2tree(data, 'DemographicId', 'ParentId');
                        console.log($scope.tree_data);
                        console.log(data);

                        //alert(DataDemo);
                    }).error(function (data, status, headers, config) {
                        // called asynchronously if an error occurs
                        // or server returns response with an error status.
                        return data;
                    });
            }
        ]
    )
    ;
})
();
