import { Component, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { BillsService } from '../../services/bills.service';
import { ParticipantsService } from '../../services/participants.service';
import { BillItemsService } from '../../services/bill-items.service';
import { PaymentsService } from '../../services/payments.service';
import { ItemConsumersService } from '../../services/item-consumers.service';
import { ChargesService } from '../../services/charges.service';
import { Bill } from '../../models/bill';
import { Participant } from '../../models/participant';
import { BillItem } from '../../models/bill-item';
import { Payment } from '../../models/payment';
import { Charge } from '../../models/charge';

// Settlement calculation interface
export interface ParticipantSettlement {
    participantId: string;
    name: string;
    itemsShare: number;
    chargesShare: number;
    totalShare: number;
    totalPaid: number;
    balance: number;
}

export interface SettlementTransfer {
    from: string;
    fromName: string;
    to: string;
    toName: string;
    amount: number;
}

@Component({
    selector: 'app-bill-detail',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './bill-detail.html',
    styleUrl: './bill-detail.css',
})
export class BillDetailComponent {
    constructor(
        private route: ActivatedRoute,
        private router: Router,
        private billsService: BillsService,
        private participantsService: ParticipantsService,
        private billItemsService: BillItemsService,
        private paymentsService: PaymentsService,
        private itemConsumersService: ItemConsumersService,
        private chargesService: ChargesService,
        private cdr: ChangeDetectorRef
    ) { }

    billId: string = '';
    bill: Bill | null = null;
    loading = true;
    error?: string;

    // Active tab
    activeTab: 'participants' | 'items' | 'charges' | 'payments' | 'summary' = 'participants';

    // Participants
    participants: Participant[] = [];
    participantsLoading = false;
    newParticipantName = '';

    // Items
    items: BillItem[] = [];
    itemsLoading = false;
    newItemDescription = '';
    newItemPrice: number | null = null;
    billTotal = 0;

    // Item consumers
    itemConsumers: Map<string, string[]> = new Map();
    selectedItemForConsumers: BillItem | null = null;
    isConsumersDialogOpen = false;

    // Charges
    charges: Charge | null = null;
    chargesLoading = false;
    taxCents: number = 0;
    tipCents: number = 0;
    discountCents: number = 0;

    // Payments
    payments: Payment[] = [];
    paymentsLoading = false;
    newPaymentParticipantId = '';
    newPaymentAmount: number | null = null;
    paymentsTotal = 0;

    // Settlement
    settlements: ParticipantSettlement[] = [];
    transfers: SettlementTransfer[] = [];
    summaryItemsTotal = 0;
    summaryChargesTotal = 0;
    summaryGrandTotal = 0;

    async ngOnInit() {
        this.billId = this.route.snapshot.paramMap.get('id') || '';
        if (this.billId) {
            await this.loadBill();
        } else {
            this.error = 'No bill ID provided';
            this.loading = false;
        }
    }

    async loadBill() {
        this.loading = true;
        const { data, error } = await this.billsService.getBill(this.billId);
        if (error) {
            this.error = error.message;
            this.bill = null;
        } else {
            this.bill = data;
            this.error = undefined;
            // Load initial tab data
            await this.loadTabData();
        }
        this.loading = false;
        this.cdr.detectChanges();
    }

    async loadTabData() {
        switch (this.activeTab) {
            case 'participants':
                await this.loadParticipants();
                break;
            case 'items':
                await this.loadItems();
                await this.loadParticipants();
                await this.loadAllItemConsumers();
                break;
            case 'charges':
                await this.loadCharges();
                break;
            case 'payments':
                await this.loadPayments();
                await this.loadParticipants();
                await this.loadBillTotal();
                break;
            case 'summary':
                await this.calculateSettlement();
                break;
        }
    }

    async switchTab(tab: 'participants' | 'items' | 'charges' | 'payments' | 'summary') {
        this.activeTab = tab;
        await this.loadTabData();
        this.cdr.detectChanges();
    }

    goBack() {
        this.router.navigate(['/bill']);
    }

    // Participants methods
    async loadParticipants() {
        this.participantsLoading = true;
        const { data, error } = await this.participantsService.listParticipants(this.billId);
        if (error) {
            this.error = error.message;
            this.participants = [];
        } else {
            this.participants = data ?? [];
        }
        this.participantsLoading = false;
        this.cdr.detectChanges();
    }

    async addParticipant() {
        if (!this.newParticipantName.trim()) return;

        const { error } = await this.participantsService.addParticipant({
            bill_id: this.billId,
            name: this.newParticipantName.trim()
        });

        if (error) {
            this.error = error.message;
        } else {
            this.newParticipantName = '';
            await this.loadParticipants();
        }
        this.cdr.detectChanges();
    }

    async removeParticipant(participantId: string) {
        const prev = this.participants;
        this.participants = this.participants.filter(p => p.id !== participantId);
        this.cdr.detectChanges();

        const { error } = await this.participantsService.removeParticipant(participantId);
        if (error) {
            this.error = error.message;
            this.participants = prev;
            this.cdr.detectChanges();
        }
    }

    // Items methods
    async loadItems() {
        this.itemsLoading = true;
        const { data, error } = await this.billItemsService.listItems(this.billId);
        if (error) {
            this.error = error.message;
            this.items = [];
        } else {
            this.items = data ?? [];
            this.billTotal = this.items.reduce((sum, item) => sum + (item.price || 0), 0);
        }
        this.itemsLoading = false;
        this.cdr.detectChanges();
    }

    async addItem() {
        if (!this.newItemDescription.trim() || !this.newItemPrice) return;

        const { error } = await this.billItemsService.addItem({
            bill_id: this.billId,
            name: this.newItemDescription.trim(),
            price: this.newItemPrice
        });

        if (error) {
            this.error = error.message;
        } else {
            this.newItemDescription = '';
            this.newItemPrice = null;
            await this.loadItems();
        }
        this.cdr.detectChanges();
    }

    async removeItem(itemId: string) {
        const prev = this.items;
        this.items = this.items.filter(i => i.id !== itemId);
        this.billTotal = this.items.reduce((sum, item) => sum + (item.price || 0), 0);
        this.cdr.detectChanges();

        const { error } = await this.billItemsService.removeItem(itemId);
        if (error) {
            this.error = error.message;
            this.items = prev;
            this.billTotal = this.items.reduce((sum, item) => sum + (item.price || 0), 0);
            this.cdr.detectChanges();
        }
    }

    // Item consumers methods
    async loadAllItemConsumers() {
        this.itemConsumers.clear();
        for (const item of this.items) {
            const { data } = await this.itemConsumersService.getItemConsumers(item.id);
            if (data && data.length > 0) {
                this.itemConsumers.set(item.id, data.map(c => c.participant_id));
            }
        }
        this.cdr.detectChanges();
    }

    getItemConsumerNames(itemId: string): string {
        const consumerIds = this.itemConsumers.get(itemId) || [];
        if (consumerIds.length === 0) return 'No one assigned';
        if (consumerIds.length === this.participants.length) return 'Everyone';
        return consumerIds.map(id => this.getParticipantName(id)).join(', ');
    }

    getItemConsumerCount(itemId: string): number {
        return this.itemConsumers.get(itemId)?.length || 0;
    }

    openConsumersDialog(item: BillItem) {
        this.selectedItemForConsumers = item;
        this.isConsumersDialogOpen = true;
    }

    closeConsumersDialog() {
        this.selectedItemForConsumers = null;
        this.isConsumersDialogOpen = false;
    }

    isParticipantConsumer(itemId: string, participantId: string): boolean {
        const consumers = this.itemConsumers.get(itemId) || [];
        return consumers.includes(participantId);
    }

    async toggleConsumer(itemId: string, participantId: string) {
        const consumers = this.itemConsumers.get(itemId) || [];
        let newConsumers: string[];

        if (consumers.includes(participantId)) {
            newConsumers = consumers.filter(id => id !== participantId);
        } else {
            newConsumers = [...consumers, participantId];
        }

        this.itemConsumers.set(itemId, newConsumers);
        this.cdr.detectChanges();

        const { error } = await this.itemConsumersService.setItemConsumers(itemId, newConsumers);
        if (error) {
            this.error = error.message;
            this.itemConsumers.set(itemId, consumers);
            this.cdr.detectChanges();
        }
    }

    async selectAllConsumers(itemId: string) {
        const allParticipantIds = this.participants.map(p => p.id);
        this.itemConsumers.set(itemId, allParticipantIds);
        this.cdr.detectChanges();

        const { error } = await this.itemConsumersService.setItemConsumers(itemId, allParticipantIds);
        if (error) {
            this.error = error.message;
        }
    }

    async clearAllConsumers(itemId: string) {
        this.itemConsumers.set(itemId, []);
        this.cdr.detectChanges();

        const { error } = await this.itemConsumersService.setItemConsumers(itemId, []);
        if (error) {
            this.error = error.message;
        }
    }

    // Charges methods
    async loadCharges() {
        this.chargesLoading = true;
        const { data } = await this.chargesService.getCharges(this.billId);

        if (data) {
            this.charges = data;
            this.taxCents = data.tax_cents || 0;
            this.tipCents = data.tip_cents || 0;
            this.discountCents = data.discount_cents || 0;
        } else {
            this.charges = null;
            this.taxCents = 0;
            this.tipCents = 0;
            this.discountCents = 0;
        }

        this.chargesLoading = false;
        this.cdr.detectChanges();
    }

    async saveCharges() {
        const { error } = await this.chargesService.upsertCharges({
            bill_id: this.billId,
            tax_cents: this.taxCents,
            tip_cents: this.tipCents,
            discount_cents: this.discountCents
        });

        if (error) {
            this.error = error.message;
        }
        this.cdr.detectChanges();
    }

    get chargesTotal(): number {
        return this.taxCents + this.tipCents - this.discountCents;
    }

    // Payments methods
    async loadPayments() {
        this.paymentsLoading = true;
        const { data, error } = await this.paymentsService.listPayments(this.billId);
        if (error) {
            this.error = error.message;
            this.payments = [];
        } else {
            this.payments = data ?? [];
            this.paymentsTotal = this.payments.reduce((sum, p) => sum + (p.amount_cents || 0), 0);
        }
        this.paymentsLoading = false;
        this.cdr.detectChanges();
    }

    async loadBillTotal() {
        const { data } = await this.billItemsService.listItems(this.billId);
        const itemsTotal = (data ?? []).reduce((sum, item) => sum + (item.price || 0), 0);

        const { data: chargesData } = await this.chargesService.getCharges(this.billId);
        const chargesTotal = chargesData
            ? (chargesData.tax_cents + chargesData.tip_cents - chargesData.discount_cents)
            : 0;

        this.billTotal = itemsTotal + chargesTotal;
        this.cdr.detectChanges();
    }

    get remainingAmount(): number {
        return this.billTotal - this.paymentsTotal;
    }

    async addPayment() {
        if (!this.newPaymentParticipantId || !this.newPaymentAmount) return;

        if (this.newPaymentAmount > this.remainingAmount) {
            this.error = `Payment cannot exceed remaining amount (${this.remainingAmount} ${this.bill?.currency})`;
            this.cdr.detectChanges();
            return;
        }

        const { error } = await this.paymentsService.addPayment({
            bill_id: this.billId,
            participant_id: this.newPaymentParticipantId,
            amount_cents: this.newPaymentAmount
        });

        if (error) {
            this.error = error.message;
        } else {
            this.newPaymentParticipantId = '';
            this.newPaymentAmount = null;
            await this.loadPayments();
        }
        this.cdr.detectChanges();
    }

    async removePayment(paymentId: string) {
        const prev = this.payments;
        this.payments = this.payments.filter(p => p.id !== paymentId);
        this.paymentsTotal = this.payments.reduce((sum, p) => sum + (p.amount_cents || 0), 0);
        this.cdr.detectChanges();

        const { error } = await this.paymentsService.removePayment(paymentId);
        if (error) {
            this.error = error.message;
            this.payments = prev;
            this.paymentsTotal = this.payments.reduce((sum, p) => sum + (p.amount_cents || 0), 0);
            this.cdr.detectChanges();
        }
    }

    getParticipantName(participantId: string): string {
        const participant = this.participants.find(p => p.id === participantId);
        return participant?.name ?? 'Unknown';
    }

    // Settlement methods
    async calculateSettlement() {
        const [participantsRes, itemsRes, paymentsRes, chargesRes] = await Promise.all([
            this.participantsService.listParticipants(this.billId),
            this.billItemsService.listItems(this.billId),
            this.paymentsService.listPayments(this.billId),
            this.chargesService.getCharges(this.billId)
        ]);

        const participants = participantsRes.data ?? [];
        const items = itemsRes.data ?? [];
        const payments = paymentsRes.data ?? [];
        const charges = chargesRes.data;

        // Store participants for name lookup
        this.participants = participants;

        // Load item consumers
        const itemConsumersMap = new Map<string, string[]>();
        for (const item of items) {
            const { data } = await this.itemConsumersService.getItemConsumers(item.id);
            if (data && data.length > 0) {
                itemConsumersMap.set(item.id, data.map(c => c.participant_id));
            }
        }

        // Calculate totals
        this.summaryItemsTotal = items.reduce((sum, item) => sum + (item.price || 0), 0);
        this.summaryChargesTotal = charges
            ? (charges.tax_cents + charges.tip_cents - charges.discount_cents)
            : 0;
        this.summaryGrandTotal = this.summaryItemsTotal + this.summaryChargesTotal;

        // Initialize settlements
        const settlementMap = new Map<string, ParticipantSettlement>();
        for (const p of participants) {
            settlementMap.set(p.id, {
                participantId: p.id,
                name: p.name,
                itemsShare: 0,
                chargesShare: 0,
                totalShare: 0,
                totalPaid: 0,
                balance: 0
            });
        }

        // Calculate items share
        for (const item of items) {
            const consumers = itemConsumersMap.get(item.id) || [];
            if (consumers.length > 0) {
                const sharePerPerson = (item.price || 0) / consumers.length;
                for (const consumerId of consumers) {
                    const settlement = settlementMap.get(consumerId);
                    if (settlement) {
                        settlement.itemsShare += sharePerPerson;
                    }
                }
            } else {
                const sharePerPerson = (item.price || 0) / participants.length;
                for (const p of participants) {
                    const settlement = settlementMap.get(p.id);
                    if (settlement) {
                        settlement.itemsShare += sharePerPerson;
                    }
                }
            }
        }

        // Distribute charges equally among all participants
        if (participants.length > 0 && this.summaryChargesTotal !== 0) {
            const chargesPerPerson = this.summaryChargesTotal / participants.length;
            for (const [, settlement] of settlementMap) {
                settlement.chargesShare = chargesPerPerson;
            }
        }

        // Calculate payments
        for (const payment of payments) {
            const settlement = settlementMap.get(payment.participant_id);
            if (settlement) {
                settlement.totalPaid += payment.amount_cents || 0;
            }
        }

        // Calculate final balances
        for (const [, settlement] of settlementMap) {
            settlement.totalShare = settlement.itemsShare + settlement.chargesShare;
            settlement.balance = settlement.totalShare - settlement.totalPaid;
        }

        this.settlements = Array.from(settlementMap.values());
        this.calculateTransfers();
        this.cdr.detectChanges();
    }

    calculateTransfers() {
        const debtors = this.settlements
            .filter(s => s.balance > 0.01)
            .map(s => ({ ...s }))
            .sort((a, b) => b.balance - a.balance);

        const creditors = this.settlements
            .filter(s => s.balance < -0.01)
            .map(s => ({ ...s, balance: Math.abs(s.balance) }))
            .sort((a, b) => b.balance - a.balance);

        this.transfers = [];

        let i = 0, j = 0;
        while (i < debtors.length && j < creditors.length) {
            const debtor = debtors[i];
            const creditor = creditors[j];

            const amount = Math.min(debtor.balance, creditor.balance);

            if (amount > 0.01) {
                this.transfers.push({
                    from: debtor.participantId,
                    fromName: debtor.name,
                    to: creditor.participantId,
                    toName: creditor.name,
                    amount: Math.round(amount)
                });
            }

            debtor.balance -= amount;
            creditor.balance -= amount;

            if (debtor.balance < 0.01) i++;
            if (creditor.balance < 0.01) j++;
        }
    }
}
