angular.module('orderCloud')

    .config(ProductConfig)
    .directive('specSelectField', SpecSelectionDirective)
    .controller('ProductCtrl', ProductController)
    .controller('LineItemEditCtrl', LineItemEditController)
    .directive('variableProductForm', VariableProductFormDirective)

;

function VariableProductFormDirective() {
    return {
        restrict: 'E',
        scope: {
            formmodel: '=',
            user: '='
        },
        templateUrl: 'catalog/product/templates/variableProduct.form.tpl.html'
    };
}

function ProductConfig($stateProvider) {
    $stateProvider
        .state('catalog.product', {
            url: '/product/:productid',
            templateUrl: 'catalog/product/templates/product.tpl.html',
            views: {
                '': {
                    templateUrl: 'catalog/product/templates/product.tpl.html',
                    controller: 'ProductCtrl',
                    controllerAs: 'product'
                },
                'view@catalog.product': {
                    templateUrl: 'catalog/product/templates/product.view.tpl.html',
                    controller: 'ProductCtrl',
                    controllerAs: 'product'
                }
            },
            resolve: {
                Product: function($stateParams, OrderCloud) {
                    return OrderCloud.Me.GetProduct($stateParams.productid);
                },
                SpecList: function(OrderCloud, $q, $stateParams) {
                    var queue = [];
                    var dfd = $q.defer();
                    OrderCloud.Specs.ListProductAssignments(null, $stateParams.productid)
                        .then(function(data) {
                            angular.forEach(data.Items, function(assignment) {
                                queue.push(OrderCloud.Specs.Get(assignment.SpecID));
                            });
                            $q.all(queue)
                                .then(function(result) {
                                    dfd.resolve(result);
                                });
                        })
                        .catch(function(response) {

                        });
                    return dfd.promise;
                },
                PrintProduct: function($http, $cookieStore, $stateParams, Product) {
                    if (Product.xp.Type == 'Variable') {
                        var user = $cookieStore.get('print_login');
                        return $http({ method: 'GET', url: 'https://fedexoffice.four51ordercloud.com/api/Chilis/Products/' + $stateParams.productid, headers: { 'Authorization': user.Auth}});
                    }
                }
            }
        })
        .state('catalog.product.config', {
            url: '/config/:specformid',
            views: {
                'specFormView@catalog.product': {
                    templateUrl: function($stateParams) {
                        var spec_form = 'default-spec-form';
                        if ($stateParams.specformid) {
                            spec_form = $stateParams.specformid;
                        }
                        return 'catalog/product/templates/spec-forms/' + spec_form + '.tpl.html';
                    },
                    controller: 'ProductCtrl',
                    controllerAs: 'product'
                }
            }
        })
        .state('catalog.lineitem', {
            url: '/lineitem/:lineitemid/edit/:specformid',
            views: {
                '': {
                    templateUrl: 'catalog/product/templates/lineitem.edit.tpl.html',
                    controller: 'LineItemEditCtrl',
                    controllerAs: 'product'
                },
                'view@catalog.lineitem': {
                    templateUrl: function($stateParams) {
                        var spec_form = 'default-spec-form';
                        if ($stateParams.specformid) {
                            spec_form = $stateParams.specformid;
                        }
                        return 'catalog/product/templates/spec-forms/' + spec_form + '.tpl.html';
                    },
                    controller: 'LineItemEditCtrl',
                    controllerAs: 'product'
                }
            },
            resolve: {
                LineItem: function($stateParams, Order, OrderCloud) {
                    return OrderCloud.LineItems.Get(Order.ID, $stateParams.lineitemid);
                },
                LI_Product: function(LineItem, OrderCloud) {
                    return OrderCloud.Me.GetProduct(LineItem.ProductID);
                },
                LI_SpecList: function(OrderCloud, $q, LineItem) {
                    var queue = [];
                    var dfd = $q.defer();
                    OrderCloud.Specs.ListProductAssignments(null, LineItem.ProductID)
                        .then(function(data) {
                            angular.forEach(data.Items, function(assignment) {
                                queue.push(OrderCloud.Specs.Get(assignment.SpecID));
                            });
                            $q.all(queue)
                                .then(function(result) {
                                    dfd.resolve(result);
                                });
                        })
                        .catch(function(response) {

                        });
                    return dfd.promise;
                }
            }
        });
}

function SpecSelectionDirective(OrderCloud) {
    return {
        scope: {
            spec: '='
        },
        templateUrl: 'catalog/product/templates/spec.selectionfield.tpl.html',
        link: function(scope) {
            scope.showField = false;
            scope.$watch(function() {
                return scope.spec.OptionID;
            }, function(newVal, oldVal) {
                if (!newVal) return;
                OrderCloud.Specs.GetOption(scope.spec.ID, scope.spec.OptionID)
                    .then(function(specOption) {
                        if (specOption.IsOpenText) {
                            scope.showField = true;
                            scope.spec.Value = null;
                        }
                        else {
                            scope.showField = false;
                        }
                    });
            });
        }
    };
}

function ProductController($cookieStore, $timeout, $http, Product, SpecList, Order, PrintProduct) {
    var vm = this;
    vm.item = Product;
    vm.order = Order;
    vm.item.Specs = SpecList;
    if (vm.item.xp.Type == 'Variable') vm.printVariants = PrintProduct.data.Variants;
    vm.showImage = true;
    vm.imageRefeshTime = new Date();

    vm.EditVariant = function(id) {
        var user = $cookieStore.get('print_login');
        $http({ method: 'GET', url: 'https://fedexoffice.four51ordercloud.com/api/Chilis/variant', params: {'ProductInteropID': PrintProduct.data.InteropID, 'VariantInteropID': id}, headers: { 'Authorization': user.Auth}}).success(function(data) {
            vm.selectedVariant = data;
        });
    };

    vm.SelectVariant = function(id) {
        var user = $cookieStore.get('print_login');
        $http({ method: 'GET', url: 'https://fedexoffice.four51ordercloud.com/api/Chilis/variant', params: {'ProductInteropID': PrintProduct.data.InteropID, 'VariantInteropID': id}, headers: { 'Authorization': user.Auth}}).success(function(data) {
            vm.item.variableProduct = data;
        });
    };

    vm.CreateVariant = function() {
        vm.selectedVariant = {
            "ProductInteropID": vm.item.ID,
            "Specs": PrintProduct.data.Specs
        };
    }

    vm.UpdateVariant = function() {
        var user = $cookieStore.get('print_login');
        vm.showImage = false;
        $http({ method: 'POST', url: 'https://fedexoffice.four51ordercloud.com/api/Chilis/variant', data: vm.selectedVariant, headers: { 'Authorization': user.Auth}}).success(function(data) {
            $timeout(function() {
                vm.imageRefeshTime = new Date();
                return vm.showImage = true;
            }, 100);
            vm.selectedVariant = data;
        });
    }
}

function LineItemEditController($state, Underscore, LineItem, OrderCloud, LineItemHelpers, LI_Product, LI_SpecList) {
    var vm = this;
    vm.item = LI_Product;
    var originalQuantity = LineItem.Quantity;
    vm.item.Quantity = LineItem.Quantity;
    var originalSpecs = angular.copy(LineItem.Specs);
    vm.item.Specs = LI_SpecList;
    var spec_value = null;
    angular.forEach(vm.item.Specs, function(spec) {
        spec_value = Underscore.where(LineItem.Specs, {SpecID: spec.ID})[0];
        if (spec_value) {
            spec.Value = spec_value.Value;
            spec.OptionID = spec_value.OptionID;
        }
    });

    function findDifferences() {
        var patchObject = {};
        if (vm.item.Quantity !== originalQuantity) {
            patchObject.Quantity = vm.item.Quantity;
        }
        angular.forEach(vm.item.Specs, function(spec) {
            var origSpec = Underscore.where(originalSpecs, {SpecID: spec.ID})[0];
            if (!origSpec || origSpec.Value !== spec.Value || origSpec.OptionID !== spec.OptionID) {
                if(!patchObject.Specs) patchObject.Specs = [];
                patchObject.Specs.push(spec);
            }
        });
        return patchObject;
    }

    vm.UpdateLineItem = function() {
        var patchObj = findDifferences();
        if (patchObj.Quantity || patchObj.Specs) {
            if (patchObj.Specs) patchObj.Specs = LineItemHelpers.SpecConvert(patchObj.Specs);
            OrderCloud.LineItems.Patch(LineItem.OrderID, LineItem.ID, patchObj)
                .then(function() {
                    $state.go('cart')
                });
        }
        else $state.go('cart');
    }
}
