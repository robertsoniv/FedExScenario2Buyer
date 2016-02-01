angular.module('orderCloud')
	.config(checkoutShippingConfig)
	.controller('CheckoutShippingCtrl', CheckoutShippingController)
    .factory('OrderShippingAddress', OrderShippingAddressFactory)
;

function checkoutShippingConfig($stateProvider) {
	$stateProvider
		.state('checkout.shipping', {
			url: '/shipping',
			templateUrl: 'checkout/shipping/templates/checkout.shipping.tpl.html',
			controller: 'CheckoutShippingCtrl',
			controllerAs: 'checkoutShipping',
            resolve: {
                DeliveryMethods: function() {
                    return [
                        {
                            Name: 'FedEx SameDay',
                            Multiplier: 2
                        },
                        {
                            Name: 'FedEx Standard Overnight',
                            Multiplier: 1.9
                        },
                        {
                            Name: 'FedEx 2 Day',
                            Multiplier: 1.5
                        },
                        {
                            Name: 'FedEx Ground',
                            Multiplier: 1
                        }
                    ]
                }

            }
		})
}

function CheckoutShippingController($state, $rootScope, OrderCloud, OrderShippingAddress, DeliveryMethods) {
	var vm = this;
    vm.saveAddress = null;
    vm.isAlsoBilling = null;
    vm.address = {};
    vm.SaveShippingAddress = saveShipAddress;
    vm.SaveCustomAddress = saveCustomAddress;
    vm.customShipping = false;
    vm.shippingAddress = null;
    vm.deliveryMethods = DeliveryMethods;

    function saveShipAddress(order) {
        if (order && order.ShippingAddressID) {
            OrderShippingAddress.Set(order.ShippingAddressID);
            OrderCloud.Orders.Patch(order.ID, {ShippingAddressID: order.ShippingAddressID})
                .then(function() {
                    $state.reload();
                    //$rootScope.$broadcast('OrderShippingAddressChanged', order, address);
                });
            //OrderCloud.Addresses.Get(order.ShippingAddressID)
            //    .then(function(address){
            //        OrderCloud.Orders.SetShippingAddress(order.ID, address)
            //            .then(function() {
            //                $rootScope.$broadcast('OrderShippingAddressChanged', order, address);
            //            });
            //    })

        }
    }

    function saveCustomAddress(order) {
        if (vm.saveAddress) {
            OrderCloud.Addresses.Create(vm.address)
                .then(function(address) {
                    OrderCloud.Me.Get()
                        .then(function(me) {
                            OrderCloud.Addresses.SaveAssignment({
                                    AddressID: address.ID,
                                    UserID: me.ID,
                                    IsBilling: vm.isAlsoBilling,
                                    IsShipping: true
                                })
                                .then(function() {
                                    OrderCloud.Addresses.Get(address.ID)
                                        .then(function(address) {
                                            OrderCloud.Orders.SetShippingAddress(order.ID, address)
                                                .then(function() {
                                                    $state.reload();
                                                });
                                        })
                                });
                        });
                });
        }
        else {
            OrderCloud.Orders.SetShippingAddress(order.ID, vm.address)
                .then(function() {
                    $state.reload();
                });
        }
    }
}

function OrderShippingAddressFactory($q, $localForage, appname, OrderCloud) {
    var StorageName = appname + '.ShippingAddressID';
    return {
        Get: Get,
        Set: Set,
        Clear: Clear
    };

    function Get() {
        var dfd = $q.defer();
        $localForage.getItem(StorageName)
            .then(function(shipID) {
                if (shipID) {
                    OrderCloud.Addresses.Get(shipID)
                        .then(function(address) {
                            if (!address.Items) {
                                dfd.resolve(address);
                            }
                            else dfd.reject();
                        })
                        .catch(function() {
                            Clear();
                            dfd.reject();
                        });
                }
                else dfd.reject();
            })
            .catch(function() {
                dfd.reject();
            });
        return dfd.promise;
    }

    function Set(ShipAddressID) {
        $localForage.setItem(StorageName, ShipAddressID);
    }

    function Clear() {
        $localForage.removeItem(StorageName);
    }
}
