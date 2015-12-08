angular.module( 'orderCloud' )

	.config( AccountConfig )
	.controller( 'AccountCtrl', AccountController )
	.controller( 'ConfirmPasswordCtrl', ConfirmPasswordController )
	.controller( 'ChangePasswordCtrl', ChangePasswordController )
    .factory( 'AccountService', AccountService )

;

function AccountConfig( $stateProvider ) {
	$stateProvider
		.state( 'base.account', {
			url: '/account',
			templateUrl:'account/templates/account.tpl.html',
			controller:'AccountCtrl',
			controllerAs: 'account',
			resolve: {
				Profile: function(Me) {
					return Me.Get();
				}
			}
		})
		.state( 'base.changePassword', {
			url: '/account/changepassword',
			templateUrl: 'account/templates/changePassword.tpl.html',
			controller: 'ChangePasswordCtrl',
			controllerAs: 'changePassword',
			resolve: {
				CurrentUser: function(Me) {
					return Me.Get();
				}
			}
		})
}

function AccountController( $exceptionHandler, toastr, Profile, AccountService ) {
	var vm = this;
	vm.profile = angular.copy(Profile);
	var currentProfile = Profile;

	vm.update = function() {
		AccountService.Update(currentProfile, vm.profile)
			.then(function(data) {
				vm.profile = angular.copy(data);
				currentProfile = data;
				toastr.success('Account changes were saved.', 'Success!');
			})
			.catch(function(ex) {
				vm.profile = currentProfile;
				$exceptionHandler(ex)
			})
	};

	vm.resetForm = function(form) {
		vm.profile = currentProfile;
		form.$setPristine(true);
	};
}

function ConfirmPasswordController( $uibModalInstance ) {
	var vm = this;

	vm.submit = function() {
		$uibModalInstance.close(vm.password);
	};

	vm.cancel = function() {
		$uibModalInstance.dismiss('cancel');
	};
}

function ChangePasswordController( $state, $exceptionHandler, toastr, AccountService, CurrentUser ) {
	var vm = this;
	vm.currentUser = CurrentUser;

	vm.changePassword = function() {
		AccountService.ChangePassword(vm.currentUser)
			.then(function() {
				toastr.success('Password successfully changed', 'Success!');
				$state.go('base.account');
			})
			.catch(function(ex) {
				$exceptionHandler(ex)
			});
	};
}

function AccountService( $q, $uibModal, Credentials, AdminUsers ) {
    var service = {
        Update: _update,
        ChangePassword: _changePassword
    };

    function _update(currentProfile, newProfile) {
        var deferred = $q.defer();

        function updateUser() {
            AdminUsers.Update(currentProfile.ID, newProfile)
                .then(function(data) {
                    deferred.resolve(data);
                })
                .catch(function(ex) {
                    deferred.reject(ex);
                })
        }

        var modalInstance = $uibModal.open({
            animation: true,
            templateUrl: 'account/templates/confirmPassword.modal.tpl.html',
            controller: 'ConfirmPasswordCtrl',
            controllerAs: 'confirmPassword',
            size: 'sm'
        });

        modalInstance.result.then(function(password) {
            var checkPasswordCredentials = {
                Username: currentProfile.Username,
                Password: password
            };
            Credentials.Get(checkPasswordCredentials).then(
                function() {
                    updateUser();
                }).catch(function( ex ) {
                    deferred.reject(ex);
                });
        }, function() {
            angular.noop();
        });

        return deferred.promise;
    }

    function _changePassword(currentUser) {
        var deferred = $q.defer();

        var checkPasswordCredentials = {
            Username: currentUser.Username,
            Password: currentUser.CurrentPassword
        };

        function changePassword() {
            currentUser.Password = currentUser.NewPassword;
            AdminUsers.Update(currentUser.ID, currentUser)
                .then(function() {
                    deferred.resolve();
                });
        }

        Credentials.Get(checkPasswordCredentials).then(
            function() {
                changePassword();
            }).catch(function( ex ) {
                deferred.reject(ex);
            });

        return deferred.promise;
    }

    return service;
}
